# GR Media

GR Media es una aplicación de escritorio para Windows que ayuda a preparar y
presentar el contenido multimedia de las reuniones de la congregación: descarga
los archivos del programa de la reunión, los organiza por día y los muestra en
las pantallas del Salón del Reino.

Es un fork de [Meeting Media Manager (M³)](https://github.com/sircharlo/meeting-media-manager),
adaptado y ampliado para el trabajo de producción de GR Media, con una interfaz
propia en español y funciones de estudio que no existen en el proyecto original.

## Funciones propias

- **Modo estudio** con previa (PVW) y programa (PGM): prepara una cámara, una
  captura de ventana o un archivo multimedia en la previa y llévalo al aire con
  un corte o una transición.
- **Multiview** a pantalla completa para el operador, con previa, programa,
  segunda salida, monitor del orador, sitio web y el estado de las fuentes.
- **Monitores** con una imagen en vivo de cada salida y la pantalla física a la
  que está asignada.
- **Pantallas de salida** separadas para multimedia y cámara, con texto del año,
  encuadre de cámara y captura de ventanas o pantallas.
- **Cronómetro de la reunión** con partes, avisos al orador, informe PDF, control
  remoto por red local para la tableta del atril y PIN para proteger los ajustes.
- **Paneles de antes y después de la reunión** con cuenta atrás, música de fondo,
  grabación y listas de comprobación editables.
- Integración con **Zoom** y **OBS Studio** para compartir la salida y cambiar de
  escena.

## Requisitos

- Windows 10 de 64 bits o posterior.
- Para desarrollar: Node.js 24, Yarn 4 y las herramientas de compilación de
  Electron para `robotjs`.

## Desarrollo

```powershell
yarn install
yarn electron-rebuild
yarn dev
```

Comprobaciones y pruebas:

```powershell
yarn lint
yarn test:unit
```

Empaquetado (instalador NSIS y portable):

```powershell
yarn build
```

Los artefactos se generan en la carpeta de compilación configurada por Quasar.

## Manual

La guía completa en español está en
[MANUAL-GRMedia.md](./MANUAL-GRMedia.md), y la misma ayuda está integrada en la
aplicación, en la pestaña **Ayuda**.

## Créditos y licencia

GR Media se basa en Meeting Media Manager, creado por Olivier Savignac y sus
colaboradores. Este fork conserva la licencia [AGPL-3.0-or-later](./LICENSE.md)
del proyecto original. GR Media no está afiliado a Meeting Media Manager ni a
JW.org.
