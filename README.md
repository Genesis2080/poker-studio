# 🃏 Poker Study — Aplicación de Escritorio

Aplicación Electron para estudiar Texas Hold'em con:
- Guía de estudio interactiva con checkboxes de progreso
- Flashcards con sistema de calificación (fácil/regular/difícil)
- Sistema de notas personal
- Historial de sesiones de estudio
- Estadísticas de progreso avanzadas

---

## 📁 Estructura del proyecto

```
poker-study-app/
├── main.js              ← Proceso principal Electron
├── preload.js           ← Bridge seguro Node ↔ Renderer
├── package.json         ← Configuración del proyecto
├── README.md            ← Este archivo
└── renderer/
    ├── index.html       ← Interfaz de usuario
    ├── app.css          ← Estilos
    └── app.js           ← Lógica de la aplicación
```

---

## 🚀 Instalación y arranque

### Paso 1 — Instalar dependencias

```bash
# Entra en la carpeta del proyecto
cd poker-study-app

# Instala Electron
npm install
```

### Paso 2 — Arrancar la aplicación

```bash
npm start
```

Para arrancar en modo desarrollo (con DevTools abierto):

```bash
npm run dev
```

---

## 💾 Dónde se guardan los datos

Los datos (progreso, notas, sesiones, flashcards) se guardan automáticamente
en un archivo JSON en el directorio de datos de usuario de tu sistema:

| Sistema | Ruta |
|---------|------|
| **macOS** | `~/Library/Application Support/poker-study-app/poker-study/data.json` |
| **Windows** | `%APPDATA%\poker-study-app\poker-study\data.json` |
| **Linux** | `~/.config/poker-study-app/poker-study/data.json` |

La ruta exacta se muestra en la barra de título de la aplicación.

---

## 🃏 Funcionalidades

### Guía de Estudio
- 9 secciones: Fundamentos, Preflop, Flop, Turn, River, Spots Clave, MTT, ICM, Reglas de Oro
- Cada concepto tiene un checkbox — márcalos al estudiarlos
- El progreso se guarda automáticamente

### Flashcards
- 15 tarjetas integradas (Preflop, Postflop, MTT/ICM)
- Sistema de calificación: Fácil / Regular / Difícil
- Puedes crear tarjetas personalizadas
- Filtra por mazo (Preflop, Postflop, Torneos, Personalizadas)
- Baraja las cartas para practicar en orden aleatorio

### Mis Notas
- Crea notas con título, cuerpo y categoría (Preflop, Postflop, Leak detectado...)
- Buscador instantáneo
- Se guardan con timestamp automático

### Historial de Sesiones
- Registra cada sesión: fecha, duración, temas estudiados, notas y valoración
- Historial completo con vista cronológica

### Estadísticas
- KPIs: sesiones totales, horas de estudio, % conceptos dominados, racha actual
- Progreso por sección de la guía
- Rendimiento en flashcards (fácil/regular/difícil acumulados)
- Temas más estudiados (gráfico de barras)
- Grid de actividad (56 días, estilo GitHub)

---

## 🔧 Requisitos

- **Node.js** v16 o superior → https://nodejs.org
- **npm** (incluido con Node.js)
- Sistema operativo: macOS, Windows o Linux

---

## 🗑️ Resetear datos

Para borrar todos los datos y empezar desde cero, elimina el archivo `data.json`
(la ruta se muestra en la titlebar de la app) o ejecuta desde DevTools:

```javascript
// Abrir DevTools con npm run dev, luego en la consola:
await window.electronAPI.saveData({})
location.reload()
```