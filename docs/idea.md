# Idea de Aplicación: Poker App

## 1. Qué problema intenta resolver

Poker App es una herramienta de estudio para jugadores de póker que desean mejorar su juego mediante el análisis sistemático de manos, el estudio estructurado de conceptos teóricos y el uso de tarjetas de memoria (flashcards) para la retención de información. El póker es un juego de información incompleta que requiere una actualización constante de conocimientos sobre estrategia, matemáticas y lectura de rivales. Muchos jugadores tienen dificultades para organizar su tiempo de estudio y seguimiento de su progreso. Esta aplicación resuelve el problema de tener notas dispersas, recursos de estudio desconectados y sin forma de medir la mejora en las habilidades de póker.

## 2. Usuario objetivo

El usuario objetivo es el jugador de póker recreacional o semi-profesional que:

- Juega regularmente (al menos una vez a la semana) en mesas de póker online o presencial
- Tiene conocimientos básicos de póker y desea dar el salto a un nivel intermedio o avanzado
- Dedica tiempo a estudiar póker fuera de las mesas (videos, libros, artículos)
- Busca una forma organizada de registrar y analizar sus manos
- Utiliza la metodología de repetición espaciada para aprender conceptos
- Desea hacer un seguimiento cuantificable de su evolución como jugador

No está diseñada para jugadores profesionales que ya tienen acceso a software especializado como PokerTracker o Hold'em Manager, sino para quienes buscan una alternativa gratuita y personalizable.

## 3. Funcionalidades principales

### 3.1 Registro de manos

- Crear, editar y eliminar registros de manos jugadas
- Almacenar información básica: fecha, posición, mano del héroe, resultado, stakes
- Añadir notas personalizadas a cada mano
- Clasificar manos por etiquetas (bluff, value bet, hero call, bad beat, etc.)
- Importar directamente desde archivos de Hand History de PokerStars (opcional)

### 3.2 Plan de estudios

- Lista estructurada de temas de estudio organizados por calle (Preflop, Flop, Turn, River, General)
- Casillas de verificación para marcar temas estudiados
- Priorización de temas (alta, media, baja)
- Añadir nuevos temas y subtemas
- Filtrar por estado (completado/pendiente) y por calle

### 3.3 Flashcards con SM-2

- Sistema de tarjetas con el algoritmo SM-2 de repetición espaciada
- Crear tarjetas con pregunta y respuesta
- Categorización por temas (posición, faroles, matemáticas, etc.)
- Cálculo automático de la siguiente fecha de revisión
- Seguimiento del número de revisiones y facilidad

### 3.4 Panel de estadísticas

- Número total de manos registradas
- Ratio de victorias/derrotas
- Estadísticas derivadas de las manos registradas (VPIP, PFR, 3-bet, C-bet)
- Progreso en el plan de estudios
- Flashcards pendientes de revisión

### 3.5 Persistencia de datos

- Almacenamiento local en el navegador (localStorage)
- Los datos se guardan automáticamente
- No requiere servidor externo

## 4. Funcionalidades opcionales

### 4.1 Análisis con IA

- Utilizar un modelo local (como Ollama) para analizar manos
- Comentarios automatizados sobre decisiones en la mano
- Sugerencias de mejora basadas en GTO

### 4.2 Importar desde Hand History

- Detectar automáticamente archivos nuevos en la carpeta de Hand History de PokerStars
- Procesar e importar manos automáticamente
- Sincronización periódica

### 4.3 Modo Oscuro

- Tema oscuro para uso nocturno
- Tema claro por defecto (o viceversa)

### 4.4 Exportación de datos

- Exportar manos en formato JSON o CSV
- Exportar plan de estudios
- Generar informes en PDF

### 4.5 Reproductor de manos

- Visualización de la mesa de póker con las cartas
- Reproducción calle a calle de la mano
- Mostrar acciones y rivales

## 5. Mejoras futuras

### 5.1 Análisis de rivales

- Crear perfiles de rivales basados en las notas
- Clasificación por tipo (TAG, LAG, Fish, Nit)
- Historial de manos contra cada rival

### 5.2 Modo multijugador

- Soporte para más de un jugador (sesiones compartidas)
- Notas colaborativas

### 5.3 Gráficos y visualizaciones

- Gráfico de evolución del winrate a lo largo del tiempo
- Distribución de manos por posición
- Mapas de calor de éxito por situación

### 5.4 Base de datos externa

- Opción de sincronizar con una base de datos externa (Firebase, Supabase)
- Acceso desde múltiples dispositivos

### 5.5 Integración con otras plataformas

- Soporte para más salas de póker (PartyPoker, Winamax, etc.)
- Importación desde otros formatos de hand history

### 5.6 Comunidad

- Compartir planes de estudios
- Compartir mazos de flashcards
- Clasificaciones entre usuarios

---