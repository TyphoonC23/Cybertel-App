
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importa Router para navegación entre páginas
import { Router } from '@angular/router';
// FormsModule para usar [(ngModel)] y formularios
import { FormsModule } from '@angular/forms';

// Importa componentes Ionic standalone que se usarán en el HTML
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonBadge, IonItem, IonLabel, IonDatetime
} from '@ionic/angular/standalone';
// Importa Firestore y funciones
import {
  Firestore, collection, getDocs, doc, getDoc,
  updateDoc, addDoc, query, orderBy, Timestamp
} from '@angular/fire/firestore';

@Component({
  selector: 'app-gestion-solicitudes', // Identificador para usar <app-gestion-solicitudes>
  templateUrl: './gestion-solicitudes.page.html', // HTML asociado al componente
  styleUrls: ['./gestion-solicitudes.page.scss'], // CSS asociado
  imports: [
    // Lista de componentes Ionic necesarios
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonBadge, IonItem, IonLabel, IonDatetime,
    // Módulos Angular necesarios
    CommonModule, FormsModule
  ]
})

export class GestionSolicitudesPage {

  // Array donde se guardan todas las solicitudes (productos y soporte)
  solicitudes: any[] = [];

  // Variables para manejar popup de agendar cita
  popupAbierto = false;
  // Fecha y hora seleccionada
  citaSeleccionada: Date | null = null;
  // Solicitud que se está agendando
  solicitudActual: any = null;

  // Constructor inyectando Router y Firestore
  constructor(private router: Router, private firestore: Firestore) {}

  // Método que se ejecuta al inicializar el componente
  async ngOnInit() {
    // Carga todas las solicitudes
    await this.cargarSolicitudes();
  }

  
  async cargarSolicitudes() {
    try {
      // Limpia el arreglo para evitar duplicados
      this.solicitudes = [];

      /* SOLICITUDES DE PRODUCTOS */
      // Referencia a la colección solicitudes_productos
      const refProd = collection(this.firestore, 'solicitudes_productos');
      const snapProd = await getDocs(query(refProd, orderBy('fecha', 'desc')));

      snapProd.docs.forEach((d) => {
        const data: any = d.data();

        const estado = (data.estado || 'pendiente').toLowerCase();
        if (estado === 'atendido') return; // oculta atendidos

        const fechaReal: Date =
          data.fecha?.toDate?.() || new Date(data.fecha);

        this.solicitudes.push({
          id: d.id,
          type: 'producto',
          uid: data.uid,
          clienteNombre: data.nombreCompleto || data.cliente || '',
          telefono: data.telefono,
          direccion: data.direccion,
          productos: data.productos || [],
          estado,
          fechaReal,
          fechaFormateada: fechaReal.toLocaleString('es-PE')
        });
      });

      /* SOLICITUDES DE SOPORTE */
      const refSoporte = collection(this.firestore, 'solicitudes_soporte');
      // Consulta ordenada por fecha descendente
      const snapSoporte = await getDocs(query(refSoporte, orderBy('fecha', 'desc')));

      // Recorremos cada documento de soporte
      for (const d of snapSoporte.docs) {
        // Datos del documento
        const data: any = d.data();

        // Normaliza estado
        const estado = (data.estado || 'pendiente').toLowerCase();
        if (estado === 'atendido') continue;

        const fechaReal: Date =
        // Fecha como Date
          data.fecha?.toDate?.() || new Date(data.fecha);

        // Valor por defecto
        let clienteNombre = 'Usuario';

        // Buscar nombre del usuario desde users/{uid}
        try {
          const userRef = doc(this.firestore, 'users', data.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) clienteNombre = userSnap.data()['fullName'];
        } catch {}

        // Manejo de cita si existe
        let citaFormateada = null;
        if (data.cita?.toDate)
          citaFormateada = data.cita.toDate().toLocaleString('es-PE');

        // Agrega la solicitud de soporte al array principal
        this.solicitudes.push({
          id: d.id,
          type: 'soporte',
          uid: data.uid,
          clienteNombre,
          tipoDispositivo: data.tipoDispositivo,
          descripcion: data.descripcion,
          estado,
          fechaReal,
          fechaFormateada: fechaReal.toLocaleString('es-PE'),
          cita: data.cita || null,
          citaFormateada
        });
      }

      /* ORDENAR POR FECHA (desc) */
      this.solicitudes.sort((a, b) =>
        b.fechaReal.getTime() - a.fechaReal.getTime()
      );

    } catch (error: any) {
      // Muestra alerta si falla la carga de solicitudes
      alert("Error cargando solicitudes: " + error.message);
    }
  }

  /* POPUP PARA AGENDAR CITA */
  // Abre el popup y asigna la solicitud actual
  abrirPopup(solicitud: any) {
    this.solicitudActual = solicitud;
    this.popupAbierto = true;
  }

  // Cierra el popup y limpia la cita seleccionada
  cerrarPopup() {
    this.popupAbierto = false;
    this.citaSeleccionada = null;
  }

  // Se ejecuta cuando se cambia la fecha/hora en el datetime
  onFechaHoraChange(event: any) {
    const valor = event.detail.value;
    if (valor) this.citaSeleccionada = new Date(valor);
  }

  // Confirma la cita seleccionada y la guarda en Firestore
  async confirmarCita() {
    if (!this.citaSeleccionada) {
      alert("Selecciona fecha y hora");
      return;
    }

    // Convertimos la fecha a Timestamp de Firestore
    const citaTimestamp = Timestamp.fromDate(this.citaSeleccionada);
    // Referencia al documento de soporte
    const ref = doc(this.firestore, 'solicitudes_soporte', this.solicitudActual.id);

    // Actualiza el campo cita en Firestore
    await updateDoc(ref, { cita: citaTimestamp });

    // Crea notificación para el usuario
    await addDoc(collection(this.firestore, 'notificaciones'), {
      uid: this.solicitudActual.uid,
      mensaje: `Se ha agendado una cita el ${this.citaSeleccionada.toLocaleString('es-PE')}`,
      estado: 'en proceso',
      fecha: Timestamp.now()
    });

    this.cerrarPopup();
    // Recarga solicitudes para reflejar cambios
    await this.cargarSolicitudes();
  }

  /* CAMBIAR ESTADO DE SOLICITUD */
  async cambiarEstado(solicitud: any) {
    try {
      const estadoActual = (solicitud.estado || 'pendiente').toLowerCase().trim();

      // Determina el siguiente estado
      let nuevoEstado = 'pendiente';
      if (estadoActual === 'pendiente') nuevoEstado = 'en proceso';
      else if (estadoActual === 'en proceso') nuevoEstado = 'atendido';

      // Determina la colección según el tipo de solicitud
      const coleccion = solicitud.type === 'producto'
        ? 'solicitudes_productos'
        : 'solicitudes_soporte';

      // Referencia al documento correspondiente
      const ref = doc(this.firestore, coleccion, solicitud.id);

      // Actualiza el estado en Firestore
      await updateDoc(ref, { estado: nuevoEstado });

      // Crea notificación para el usuario
      await addDoc(collection(this.firestore, 'notificaciones'), {
        uid: solicitud.uid,
        mensaje: `Su solicitud ahora está: ${nuevoEstado}`,
        estado: nuevoEstado,
        fecha: Timestamp.now()
      });

      alert("Estado actualizado");
      // Recarga solicitudes
      await this.cargarSolicitudes();

    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  // Retorna color para badge según estado
  getEstadoColor(est: string): string {
    switch ((est || '').toLowerCase()) {
      case 'pendiente': return 'danger';
      case 'en proceso': return 'warning';
      case 'atendido': return 'success';
      default: return 'medium';
    }
  }

  // Verifica si una solicitud ya tiene una cita programada
    tieneCita(solicitud: any): boolean {
    return solicitud.cita != null; // Si existe cita, retorna true
  }

  // Navega al panel principal de administrador
    volverAlPanel() {
      this.router.navigate(['/panel-admin']);
    }
  }
