import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// Router permite la navegación entre páginas
import { Router } from '@angular/router';

import { ViewWillEnter } from '@ionic/angular';

// Importamos componentes de Ionic de manera standalone
import {
  IonButton, IonCard, IonCardHeader, IonCardTitle,
  IonCardSubtitle, IonCardContent, IonContent, IonHeader,
  IonTitle, IonToolbar
} from '@ionic/angular/standalone';

// Importamos Firestore y funciones para manejar colecciones y obtener documentos
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-catalogo', // Nombre del selector para usar en HTML
  templateUrl: './catalogo.page.html', // Archivo HTML asociado
  styleUrls: ['./catalogo.page.scss'], // Archivo CSS asociado
  standalone: true, // Componente independiente
  // Componentes y módulos que se usarán en el template
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButton, IonCard, IonCardHeader, IonCardTitle,
    IonCardSubtitle, IonCardContent, CommonModule
    ]
  })
  export class CatalogoPage implements ViewWillEnter {

  // Array donde se guardarán los productos obtenidos de Firebase
  productos: any[] = []; 

  constructor(
    private router: Router,
    private firestore: Firestore
  ) {}

  // Método que se ejecuta al inicializar el componente
  async ngOnInit() {

    // Se obtiene la referencia de la colección 'productos' en Firestore
    const ref = collection(this.firestore, 'productos');
    // Obtenemos los documentos de la colección
    const snap = await getDocs(ref);

    // Mapea los documentos obtenidos para incluir el id junto con los datos
    this.productos = snap.docs.map(d => ({
      id: d.id, // Guarda el id del documento
      ...d.data() // Guarda todos los datos del documento
    }));
  }

  // Se actualiza el controlador del Carrito
  ionViewWillEnter() {
    const carrito = JSON.parse(localStorage.getItem('carritoProductos') || '[]');
    this.contadorCarrito = carrito.length; // Actualiza la cantidad real
  }

    // Agrega un producto al carrito guardado en localStorage
    agregarAlCarrito(producto: any) {

    // Si el carrito no existe, se crea vacío
    const carrito = JSON.parse(localStorage.getItem('carritoProductos') || '[]');

    // Añade el producto al carrito
    carrito.push(producto);

    // Se guarda el carrito actualizado
    localStorage.setItem('carritoProductos', JSON.stringify(carrito));

    // Actualizar contador
    this.contadorCarrito = carrito.length;

    alert('Producto agregado al carrito.');
  }

  contadorCarrito: number = 0;

  // Redirige al usuario a la página de solicitud de producto (carrito)
  irAlCarrito() {
    this.router.navigate(['/solicitud-producto']);
  }

  // Redirige al menú principal
  volverAlMenu() {
    this.router.navigate(['/menu-principal']);
  }
}
