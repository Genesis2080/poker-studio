# 🃏 Poker Guide — Instrucciones de uso

## ¿Por qué necesito un servidor local?

Los navegadores modernos bloquean la carga de archivos CSS y JS externos
cuando abres un HTML directamente desde el disco (`file://`). Necesitas
un servidor HTTP local para que los 3 archivos se comuniquen correctamente.

---

## Archivos del proyecto

```
poker-guide.html   ← página principal
poker-guide.css    ← estilos
poker-guide.js     ← lógica e interactividad
INSTRUCCIONES.md   ← este archivo
```

Coloca los **4 archivos en la misma carpeta**.

---

## Opciones para levantar el servidor local

### Opción A — Python (recomendado, viene instalado en Mac y Linux)

Abre una terminal en la carpeta donde están los archivos y ejecuta:

```bash
# Python 3
python3 -m http.server 8080

# Python 2 (si no tienes Python 3)
python -m SimpleHTTPServer 8080
```

Luego abre el navegador en:
```
http://localhost:8080/poker-guide.html
```

---

### Opción B — Node.js (si tienes Node instalado)

```bash
npx serve .
```

O con `http-server`:

```bash
npx http-server . -p 8080
```

Luego abre:
```
http://localhost:8080/poker-guide.html
```

---

### Opción C — VS Code (Live Server)

1. Instala la extensión **Live Server** de Ritwick Dey
2. Abre la carpeta en VS Code
3. Haz clic derecho sobre `poker-guide.html`
4. Selecciona **"Open with Live Server"**

El navegador se abrirá automáticamente y se recargará al guardar cambios.

---

### Opción D — Windows (sin instalar nada)

Abre PowerShell en la carpeta de los archivos y ejecuta:

```powershell
Start-Process "http://localhost:8080"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Servidor activo en http://localhost:8080"
while ($true) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.LocalPath.TrimStart('/')
    if ($path -eq "") { $path = "poker-guide.html" }
    $file = Join-Path (Get-Location) $path
    if (Test-Path $file) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file)
        $mime = switch ($ext) {
            ".html" { "text/html; charset=utf-8" }
            ".css"  { "text/css" }
            ".js"   { "application/javascript" }
            default { "application/octet-stream" }
        }
        $context.Response.ContentType = $mime
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $context.Response.Close()
}
```

---

## Notas importantes

- El **progreso de estudio** (checkboxes marcados) se guarda en `localStorage`
  del navegador. Mientras uses siempre el mismo navegador y la misma URL,
  el progreso persiste entre sesiones.

- Si cambias de puerto o de navegador, el progreso no se comparte
  (es local a cada origen `http://localhost:PUERTO`).

- Para **resetear el progreso**, abre la consola del navegador (F12) y ejecuta:
  ```javascript
  localStorage.removeItem('poker_guide_v1')
  ```
  Luego recarga la página.