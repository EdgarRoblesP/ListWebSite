# Registro de Usuarios — Documentación de Implementación

## 1. Funcionalidad agregada

### Nueva vista de Registro (`/registro`)
Ruta protegida con `guestGuard`. Título **Registro**, subtítulo explicativo, campo **Ingresa tu correo electrónico** (requerido, validación `Validators.email`) y botón **Confirmar** azul (`.btn-primary`, mismo alto 53px que Login). Reutiliza `shared/auth-card.css` para tipografía, colores, espaciados y fondo. Estados: formulario / confirmación "Revisa tu correo" + bloque **Modo demo** cuando `/api/send-register-email` no está disponible (`ng serve`).

### Enlace en Login
Debajo del botón **Iniciar Sesión** se agregó el párrafo `¿No tienes una cuenta? Registrate` donde **Registrate** es un `<a class="auth-link" routerLink="/registro">` azul (`--color-accent`) con hover subrayado. No se modificó el CSS global; se colocó dentro del `<form>` para respetar el flujo vertical de `auth-card.css:91` (`gap: 1.5rem`).

### Flujo de registro mediante correo
Reutiliza la infraestructura de **Recuperar contraseña** (token UUID, TTL 15 min, `usedAt` para un solo uso, envío vía Resend). Diferencia: `requestRegistration` verifica que el correo **no exista** antes de generar el token; si existe, falla con `El correo ya está registrado`. El correo se envía por `POST /api/send-register-email` que construye la URL `https://<host>/completar-registro?token=...` desde los headers `x-forwarded-*` (evita open-redirect, igual que `send-reset-email.js:93`).

### Configuración de contraseña
Nueva vista `/completar-registro?token=...` con dos campos (`password`, `confirmPassword`), validador de grupo `passwordsMatchValidator`, `Validators.minLength(8)` y `MIN_PASSWORD_LENGTH`. Antes de mostrar el formulario valida el token (`validateRegistrationToken`). Al enviar, `completeRegistration` vuelve a validar, hashea la contraseña con SHA-256 (Web Crypto en navegador, Node `crypto` en servidor) y persiste.

### Almacenamiento temporal en TXT
Los usuarios se guardan en `data/usuarios.txt` con formato `email|passwordHash|name` por línea y espejo en `localStorage` (`app.users` JSON + `app.usersTxt` texto) para `ng serve`. El archivo es semilla en el deploy y se escribe en `/tmp/usuarios.txt` en Vercel (único directorio escribible). Login consulta este almacenamiento vía `UserStorageService` (capa desacoplada).

### Integración con Login
`AuthService.login` ya no compara texto plano directo; delega en `UserStorageService.validateCredentials` que intenta `GET /api/usuarios` y cae a `localStorage`. Si el password almacenado es hash (64 hex) se compara hash; si es texto plano (cuenta antigua) se compara directo. Mensaje genérico `Correo o contraseña incorrectos` para no enumerar usuarios.

---

## 2. Archivos modificados

### Ruta: `task-manager/src/app/pages/login/login.component.html`
**Función:** Interfaz de inicio de sesión (Frame 1:3).  
**Cambios realizados:** Se agregó debajo del botón `Iniciar Sesión` el párrafo `<p class="auth-footer">¿No tienes una cuenta? <a class="auth-link" routerLink="/registro">Registrate</a></p>` y se movió `</form>` para que quede dentro del formulario, manteniendo el estilo `auth-card.css`.

### Ruta: `task-manager/src/app/services/auth.service.ts`
**Función:** Lógica de autenticación simulada (sesión, tokens, login, recuperación).  
**Cambios realizados:** 
- Inyecta `UserStorageService` y delega persistencia de usuarios.
- `login` ahora usa `userStorage.validateCredentials` y mantiene retardo 600ms.
- `resetPassword` hashea la nueva contraseña antes de guardar (SHA-256) y sincroniza con `userStorage.save`.
- Nuevos miembros: `REGISTER_TOKENS_KEY`, `SEND_REGISTER_ENDPOINT`, métodos `requestRegistration`, `validateRegistrationToken`, `completeRegistration`, `sendRegisterEmail`, `readRegisterTokens` + helper `consumeTokenChecks(token,key)` genérico.

### Ruta: `task-manager/src/app/app.routes.ts`
**Función:** Definición de rutas.  
**Cambios realizados:** Importados `RegisterComponent` y `CompleteRegistrationComponent`; agregadas rutas `/registro` (guestGuard) y `/completar-registro`.

### Ruta: `task-manager/api/send-reset-email.js`
**Función:** Serverless que envía el correo de recuperación.  
**Cambios realizados:** Ninguno (se conserva intacto para cumplir "no reemplazar si es reutilizable").

---

## 3. Archivos nuevos

### Ruta: `task-manager/src/app/services/user-storage.service.ts`
**Propósito:** Capa de almacenamiento TXT desacoplada (Repository).  
**Responsabilidad principal:** Exponer `findByEmail`, `exists`, `save`, `getAll`, `validateCredentials`, `hashPassword$` como Observables. Intentar `GET/POST /api/usuarios` y caer a `localStorage` en local. Serializar espejo TXT en `app.usersTxt`.  
**Relación con otros archivos:** Es inyectado por `AuthService`; `api/usuarios.js` y `api/_lib/txtUsers.js` son su contraparte servidor. Sustituir este archivo por `UserDatabaseRepository` migra a DB sin tocar Login/Registro.

### Ruta: `task-manager/src/app/pages/register/register.component.ts`
**Propósito:** Componente de la vista Registro.  
**Responsabilidad principal:** Formulario reactivo email, llamar `auth.requestRegistration`, gestionar estados `sent`, `demoToken`, `emailSent`, errores y URL demo.  
**Relación:** Usa `AuthService` y `shared/auth-card.css`.

### Ruta: `task-manager/src/app/pages/register/register.component.html`
**Propósito:** Plantilla de Registro (dos estados: formulario / confirmación).  
**Responsabilidad:** Renderiza título, campo, botón Confirmar y bloque demo.

### Ruta: `task-manager/src/app/pages/register/register.component.css`
**Propósito:** Estilos específicos de Registro (botón demo, URL, notas).  
**Relación:** Importa `auth-card.css` primero.

### Ruta: `task-manager/src/app/pages/complete-registration/complete-registration.component.ts`
**Propósito:** Vista para configurar contraseña desde el enlace de correo.  
**Responsabilidad:** Validar token al `ngOnInit`, formulario con `passwordsMatchValidator`, llamar `auth.completeRegistration`, gestionar 4 estados (validating, tokenError, done, form).  
**Relación:** Usa `AuthService.validateRegistrationToken` y `completeRegistration`.

### Ruta: `task-manager/src/app/pages/complete-registration/complete-registration.component.html`
**Propósito:** Plantilla de Completar Registro.

### Ruta: `task-manager/src/app/pages/complete-registration/complete-registration.component.css`
**Propósito:** Estilos (hint, botón done, separadores).

### Ruta: `task-manager/api/_lib/txtUsers.js`
**Propósito:** Librería servidor que encapsula lectura/escritura del TXT.  
**Responsabilidad:** `readUsers`, `writeUsers`, `findUser`, `exists`, `upsertUser`, `hashPassword`, `verifyPassword`, `ensureSeed`. Maneja rutas `/tmp/usuarios.txt` (Vercel) y `data/usuarios.txt` (semilla).  
**Relación:** Usada por `api/usuarios.js` y futuros endpoints DB.

### Ruta: `task-manager/api/usuarios.js`
**Propósito:** Endpoint REST para el TXT (`GET /api/usuarios`, `POST /api/usuarios`).  
**Responsabilidad:** Leer/escribir el TXT vía `txtUsers.js`, validar email y hashear password si no es hash.

### Ruta: `task-manager/api/send-register-email.js`
**Propósito:** Enviar el correo de registro (hermano de `send-reset-email.js`).  
**Responsabilidad:** Validar `email`/`token`, construir `https://<host>/completar-registro?token=...` y llamar a Resend con `fetch`. Reutiliza `RESEND_API_KEY`/`RESEND_FROM`.

### Ruta: `task-manager/data/usuarios.txt`
**Propósito:** Archivo TXT temporal exigido por el contrato.  
**Responsabilidad:** Almacenar `email|hash|name` (semilla: `edgarrobles076@gmail.com|51459c...|Usuario Demo`). Espejo legible y migrable a DB.

---

## 4. Flujo de funcionamiento

```
Login
  → "¿No tienes una cuenta? Registrate" (auth-link azul)
  → /registro (Registro)
    → Ingresa correo → Confirmar (valida required + email)
      → AuthService.requestRegistration(email)
        → UserStorageService.exists(email)  (GET /api/usuarios → localStorage fallback)
        → si existe → error "ya registrado"
        → si no → genera token UUID, TTL 15min, guarda en app.registerTokens
        → POST /api/send-register-email {email, token} → Resend
          → si sent=true → "Revisa tu correo"
          → si sent=false (ng serve) → bloque Modo demo con link /completar-registro?token=...
      → Usuario abre enlace en MISMO navegador (token en localStorage)
        → /completar-registro?token=abc
          → validateRegistrationToken(token) (existe, no usado, no caducado)
          → Formulario contraseña + confirmar (min 8, match validator)
          → completeRegistration(token, password)
            → hash SHA-256 → UserStorageService.save({email, name, password:hash})
              → POST /api/usuarios → txtUsers.upsertUser → escribe /tmp/usuarios.txt + data/usuarios.txt
              → localStorage app.users + app.usersTxt
            → marca token usedAt
          → "¡Cuenta creada!" → Login
            → AuthService.login(email,password)
              → UserStorageService.validateCredentials → hash intento y compara
              → crea sesión app.session → /tareas
```

---

## 5. Migración futura a base de datos

**Qué componente administra el TXT hoy:**
`UserStorageService` (frontend) + `api/_lib/txtUsers.js` + `api/usuarios.js` (backend) + `data/usuarios.txt` (fichero). `AuthService` no conoce detalles del fichero; solo habla con `UserStorageService`.

**Cómo sustituirlo:**
1. Crear `UsuarioDatabaseRepository` que implemente `UserRepository` (`findByEmail`, `exists`, `save`, `getAll`, `validateCredentials`, `hashPassword$`) usando `HttpClient` contra `/api/usuarios-db` o directo a DB (Vercel Postgres, Supabase, etc.).
2. Reemplazar el provider en `user-storage.service.ts` o registrar el nuevo servicio con `provide: UserStorageService, useClass: UsuarioDatabaseRepository`.
3. Reescribir `api/usuarios.js` y `api/_lib/txtUsers.js` para que en lugar de `fs.readFile/writeFile` hagan `SELECT/INSERT` y `crypto` siga igual. Los endpoints mantienen la misma firma (`GET ?email`, `POST {email,password,name}`), por lo que `UserStorageService` frontend no cambia.

**Qué funciones deberían cambiar:**
- `UserStorageService.readLocal/writeLocal/fetchFromApi/syncToApi` → llamadas a la nueva DB.
- `api/_lib/txtUsers.js` completo (se borra el manejo de `fs`).
- Semilla `data/usuarios.txt` → script de migración SQL.

**Qué partes permanecen sin modificaciones:**
- `LoginComponent`, `RegisterComponent`, `CompleteRegistrationComponent` (solo consumen `AuthService`).
- `AuthService` (sigue llamando a `userStorage.*`, no a `fs`).
- `auth-card.css` y validadores de formularios.
- `api/send-register-email.js` y `send-reset-email.js` (solo envían correo).

Con esta separación, el cambio de TXT a DB es un reemplazo de **una capa**, no una reescritura de la autenticación.
