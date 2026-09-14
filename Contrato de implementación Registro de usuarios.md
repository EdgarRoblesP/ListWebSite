# Contrato de implementación — Vista de Registro

## 1. Objetivo

Implementar una nueva funcionalidad de **registro de usuarios** dentro del sistema, manteniendo completamente la identidad visual, estructura CSS y comportamiento general de la vista de **Login**.

La implementación debe permitir que un usuario:

1. Acceda a la vista de Registro desde Login.
2. Introduzca su correo electrónico.
3. Reciba un correo electrónico mediante la API de envío de correos que **ya existe en el proyecto**, siempre que su reutilización sea técnicamente posible.
4. Configure una contraseña de mínimo 8 caracteres mediante el enlace o mecanismo enviado por correo.
5. Sea almacenado temporalmente en un archivo `.txt`.
6. Pueda posteriormente iniciar sesión utilizando las credenciales almacenadas en dicho archivo.

> **Importante:** No se debe crear ni implementar una base de datos en esta fase.

---

# 2. Reglas generales del contrato

El modelo deberá cumplir las siguientes reglas:

- **No crear una base de datos.**
- **No reemplazar la API de correo existente** si puede reutilizarse.
- Antes de implementar una nueva solución de envío de correos, inspeccionar el código existente para identificar cómo funciona actualmente la recuperación de contraseña.
- Reutilizar componentes, funciones, estilos, servicios y lógica existentes siempre que sea razonable.
- No duplicar innecesariamente código que ya exista.
- Mantener el mismo estilo visual de Login.
- No modificar funcionalidades existentes que no estén relacionadas con el registro.
- No romper la funcionalidad actual de recuperación de contraseña.
- Mantener una separación clara entre presentación, lógica de negocio y almacenamiento.
- La solución temporal con `.txt` debe diseñarse de manera que posteriormente sea sencillo sustituirla por una base de datos.
- No introducir frameworks, librerías o dependencias nuevas sin que sean realmente necesarias.
- Antes de crear archivos nuevos, revisar la estructura actual del proyecto y determinar dónde corresponde cada archivo.
- Respetar las convenciones de nombres y estructura existentes en el proyecto.

---

# 3. Modificación de la vista Login

En la vista actual de **Login**, inmediatamente debajo del botón:

> **Iniciar sesión**

agregar la siguiente leyenda:

> **¿No tienes una cuenta? Registrate**

La palabra:

> **Registrate**

debe:

- Ser de color azul.
- Funcionar como hipervínculo.
- Dirigir a la nueva vista de Registro.
- Mantener el estilo visual consistente con el resto de la aplicación.

No modificar innecesariamente el diseño actual de Login.

---

# 4. Nueva vista de Registro

Crear una nueva vista destinada al registro de usuarios.

## 4.1 Título

La vista debe mostrar:

> **Registro**

## 4.2 Formulario

Debe contener un campo para ingresar:

> **Ingresa tu correo electrónico**

El campo debe:

- Ser obligatorio.
- Validar que tenga un formato válido de correo electrónico.
- Mostrar un mensaje apropiado cuando el formato sea incorrecto.
- No permitir continuar si está vacío.

## 4.3 Botón

Agregar un botón:

> **Confirmar**

El botón debe ser de color azul y mantener el mismo estilo visual utilizado en Login.

---

# 5. Estilo visual

La nueva vista de Registro debe utilizar **el mismo estilo CSS que Login**.

Antes de crear estilos nuevos:

1. Identificar qué archivo `.css` utiliza Login.
2. Identificar las clases y estilos reutilizables.
3. Reutilizar dichos estilos cuando sea posible.
4. Evitar crear estilos duplicados.

La vista de Registro debe sentirse como parte de la misma aplicación y no como una página independiente con un diseño diferente.

Se debe conservar:

- Tipografía.
- Colores.
- Espaciados.
- Tamaños.
- Estilos de botones.
- Estilos de formularios.
- Fondo.
- Alineación.
- Bordes y demás elementos visuales relevantes.

---

# 6. Flujo de registro mediante correo electrónico

El registro debe utilizar una lógica similar a la funcionalidad existente de **Recuperar contraseña**.

## 6.1 Investigación previa obligatoria

Antes de implementar esta funcionalidad, inspeccionar cómo funciona actualmente:

**Recuperar contraseña → envío de correo → cambio de contraseña**

Identificar:

- Qué archivo controla el proceso.
- Qué función realiza el envío del correo.
- Qué API utiliza.
- Cómo se genera el enlace.
- Cómo se valida el enlace.
- Cómo se identifica al usuario.
- Cómo se procesa actualmente la nueva contraseña.
- Qué información se almacena temporalmente.
- Qué archivos o servicios participan en el proceso.

La nueva funcionalidad debe aprovechar esta infraestructura siempre que sea técnicamente viable.

---

# 7. Flujo esperado

El flujo esperado es:

```text
Login
  │
  └── ¿No tienes una cuenta? Registrate
                │
                ▼
             Registro
                │
                ▼
       Usuario introduce correo
                │
                ▼
             Confirmar
                │
                ▼
       Validar correo electrónico
                │
                ▼
       Enviar correo mediante
       API existente
                │
                ▼
       Usuario abre enlace/correo
                │
                ▼
       Configura contraseña
       de mínimo 8 caracteres
                │
                ▼
       Validar contraseña
                │
                ▼
       Guardar usuario
       en archivo TXT
                │
                ▼
          Usuario registrado
                │
                ▼
              Login
                │
                ▼
       Consultar archivo TXT
       y validar credenciales
```

---

# 8. Configuración de contraseña

El usuario debe poder configurar su contraseña desde el enlace o mecanismo recibido por correo.

La contraseña debe:

- Tener como mínimo **8 caracteres**.
- Ser validada antes de guardarse.
- Mostrar un mensaje claro si no cumple el requisito.
- No almacenarse de forma insegura si la arquitectura actual permite implementar un mecanismo de hash.
- Evitar almacenar contraseñas en texto plano si existe una alternativa compatible con la tecnología utilizada actualmente.

La validación debe realizarse también del lado del servidor cuando exista lógica de backend.

---

# 9. Almacenamiento temporal de usuarios

## 9.1 Restricción

**NO crear una base de datos.**

Durante esta fase, los usuarios deberán almacenarse en un archivo `.txt`.

El archivo debe contener la información mínima necesaria para posteriormente identificar y autenticar a los usuarios.

Como mínimo deberá contemplarse:

```text
correo
contraseña
```

La estructura exacta del archivo deberá diseñarse de manera consistente y fácil de procesar.

---

# 10. Diseño pensando en la futura base de datos

Aunque actualmente se utilizará un `.txt`, la implementación debe considerar que en la siguiente fase se sustituirá este almacenamiento por una base de datos.

Por lo tanto, **no se debe mezclar directamente la lógica de Login con la manipulación del archivo TXT**.

Se recomienda una estructura similar a:

```text
Login / Registro
       │
       ▼
Lógica de autenticación
       │
       ▼
Capa de almacenamiento
       │
       ├── TXT (fase actual)
       │
       └── Base de datos (fase futura)
```

El objetivo es que posteriormente sea posible cambiar:

```text
UsuarioTXTRepository
```

por algo equivalente a:

```text
UsuarioDatabaseRepository
```

sin tener que reescribir toda la lógica de Login y Registro.

La implementación deberá favorecer:

- Separación de responsabilidades.
- Funciones reutilizables.
- Bajo acoplamiento.
- Interfaces o funciones de acceso a datos claramente definidas.
- Facilidad para reemplazar el almacenamiento temporal.

---

# 11. Login y consulta del archivo TXT

Cuando un usuario intente iniciar sesión, el sistema deberá:

1. Recibir el correo.
2. Recibir la contraseña.
3. Consultar el archivo `.txt`.
4. Buscar el usuario correspondiente.
5. Validar las credenciales.
6. Permitir el acceso si las credenciales son correctas.
7. Mostrar un mensaje apropiado si el usuario no existe.
8. Mostrar un mensaje apropiado si la contraseña es incorrecta.

La vista Login no debería encargarse directamente de leer y procesar el archivo.

La consulta deberá realizarse mediante una función o capa responsable del acceso a los usuarios.

---

# 12. Manejo de usuarios existentes

El sistema debe contemplar qué sucede cuando alguien intenta registrarse con un correo que ya existe.

Antes de crear un nuevo usuario:

```text
¿El correo ya existe?
       │
   ┌───┴───┐
   │       │
  Sí      No
   │       │
   ▼       ▼
Error    Continuar
         registro
```

No deben generarse usuarios duplicados con el mismo correo electrónico.

El mensaje mostrado al usuario debe ser claro y comprensible.

---

# 13. Manejo de errores

La implementación deberá contemplar, como mínimo:

- Correo vacío.
- Correo con formato inválido.
- Correo ya registrado.
- Error al enviar el correo.
- Enlace de registro inválido.
- Enlace expirado, si el mecanismo existente utiliza expiración.
- Contraseña menor a 8 caracteres.
- Error al guardar el usuario.
- Usuario inexistente durante Login.
- Contraseña incorrecta.
- Archivo TXT inexistente.
- Archivo TXT sin permisos de lectura/escritura.
- Problemas de comunicación con la API existente.

Los mensajes de error deben ser comprensibles para el usuario y no deben revelar información innecesaria sobre la implementación interna.

---

# 14. Comentarios obligatorios en archivos nuevos

Todo archivo nuevo que contenga lógica de programación deberá incluir comentarios explicativos de calidad.

No utilizar comentarios demasiado simples como:

```text
// Verificación de correo
```

o:

```text
// Login
```

Los comentarios deben explicar **qué hace la funcionalidad, cómo funciona y por qué existe**.

Ejemplo del nivel de detalle esperado:

```text
/*
 * Esta función valida el correo electrónico proporcionado durante el registro
 * antes de iniciar el proceso de creación de la cuenta. Primero comprueba
 * que el campo no se encuentre vacío y posteriormente verifica que el valor
 * tenga una estructura válida de correo electrónico. Esta validación evita
 * realizar solicitudes innecesarias al servicio de correo y evita almacenar
 * registros que no puedan utilizarse posteriormente para autenticar al usuario.
 *
 * La función se mantiene separada de la lógica de almacenamiento para que
 * las reglas de validación puedan reutilizarse independientemente del
 * mecanismo utilizado para guardar los usuarios.
 */
```

Los comentarios deben explicar la **intención y funcionamiento**, no simplemente repetir el nombre de la función.

---

# 15. Reutilización de código existente

Antes de crear cualquier función nueva, verificar si el proyecto ya cuenta con una funcionalidad equivalente.

Especialmente revisar:

- Recuperación de contraseña.
- Envío de correos.
- Validación de correos.
- Generación de tokens.
- Validación de tokens.
- Cambio de contraseña.
- Manejo de sesiones.
- Autenticación.
- Componentes de formularios.
- Componentes de botones.
- CSS de Login.

Si una funcionalidad existente puede reutilizarse, debe preferirse esa solución sobre crear una segunda implementación.

---

# 16. Archivos y carpetas

Antes de modificar el proyecto:

1. Analizar la estructura actual de carpetas.
2. Identificar dónde se encuentran Login y Recuperar contraseña.
3. Identificar dónde se encuentra la lógica relacionada con autenticación.
4. Identificar dónde se encuentra la API de correo.
5. Colocar cada archivo nuevo en la carpeta que corresponda a la arquitectura existente.
6. No crear carpetas nuevas si no son necesarias.

Los archivos nuevos deben tener nombres claros y consistentes con las convenciones actuales del proyecto.

---

# 17. Documentación requerida

Además de la implementación, crear un archivo:

```text
REGISTRO_IMPLEMENTACION.md
```

Este archivo debe explicar claramente qué se agregó.

Debe incluir como mínimo:

## 17.1 Funcionalidad agregada

Explicar:

- Nueva vista de Registro.
- Enlace agregado en Login.
- Flujo de registro mediante correo.
- Configuración de contraseña.
- Almacenamiento temporal en TXT.
- Integración con Login.

## 17.2 Archivos modificados

Para cada archivo modificado indicar:

```text
Ruta:
Función:
Cambios realizados:
```

Ejemplo:

```text
Ruta: /ruta/login.html

Función:
Contiene la interfaz de inicio de sesión.

Cambios realizados:
Se agregó el enlace "¿No tienes una cuenta? Registrate",
el cual dirige a la nueva vista de Registro.
```

## 17.3 Archivos nuevos

Para cada archivo nuevo indicar:

```text
Ruta:
Propósito:
Responsabilidad principal:
Relación con otros archivos:
```

## 17.4 Flujo de funcionamiento

Documentar el flujo completo:

```text
Login
→ Registro
→ Correo
→ Configuración de contraseña
→ Almacenamiento TXT
→ Login
→ Validación
```

## 17.5 Migración futura a base de datos

Explicar específicamente:

- Qué componente actualmente administra el TXT.
- Cómo podría sustituirse por una base de datos.
- Qué funciones deberían cambiar.
- Qué partes del sistema podrían permanecer sin modificaciones.

---

# 18. Restricciones de implementación

El modelo **NO deberá**:

- Crear una base de datos.
- Crear tablas SQL.
- Crear migraciones SQL.
- Reemplazar la API existente de correo sin justificar técnicamente por qué es imposible reutilizarla.
- Cambiar completamente el CSS existente.
- Crear una segunda implementación de recuperación de contraseña si puede reutilizarse la existente.
- Modificar funcionalidades ajenas al registro.
- Introducir dependencias innecesarias.
- Duplicar código existente.
- Guardar usuarios en múltiples archivos sin una razón técnica.
- Crear contraseñas de prueba o usuarios ficticios dentro del código final.
- Dejar funcionalidades simuladas como si fueran definitivas.

---

# 19. Criterios de aceptación

La implementación será considerada correcta cuando:

### Login

- [ ] Debajo de "Iniciar sesión" aparece "¿No tienes una cuenta? Registrate".
- [ ] "Registrate" aparece en azul.
- [ ] "Registrate" funciona como enlace.
- [ ] El enlace dirige correctamente a Registro.
- [ ] El diseño existente de Login permanece funcional.

### Registro

- [ ] Existe una nueva vista de Registro.
- [ ] El título es "Registro".
- [ ] Existe el campo "Ingresa tu correo electrónico".
- [ ] El correo es obligatorio.
- [ ] Se valida el formato del correo.
- [ ] Existe el botón "Confirmar".
- [ ] El botón es azul.
- [ ] La vista reutiliza el mismo CSS/estilo de Login.

### Correo electrónico

- [ ] Se inspeccionó la funcionalidad existente de recuperación de contraseña.
- [ ] Se reutilizó la API existente cuando fue técnicamente posible.
- [ ] Al confirmar un correo válido se inicia el proceso de envío.
- [ ] El usuario recibe un correo.
- [ ] El correo permite continuar con la configuración de contraseña.
- [ ] El enlace/token funciona correctamente.
- [ ] Se manejan errores de envío.

### Contraseña

- [ ] El usuario puede establecer una contraseña.
- [ ] La contraseña debe tener mínimo 8 caracteres.
- [ ] Se valida la contraseña.
- [ ] Se evita almacenar la contraseña de manera insegura cuando la arquitectura existente permita utilizar hashing.

### Almacenamiento

- [ ] No se creó una base de datos.
- [ ] Los usuarios se almacenan en un archivo TXT.
- [ ] Se evita registrar correos duplicados.
- [ ] El sistema puede leer los usuarios almacenados.
- [ ] Login consulta el archivo TXT.
- [ ] Un usuario registrado puede iniciar sesión.

### Arquitectura

- [ ] Login no contiene directamente toda la lógica de lectura del TXT.
- [ ] Registro no contiene directamente toda la lógica de almacenamiento.
- [ ] La lógica de acceso a usuarios está separada.
- [ ] El almacenamiento TXT puede sustituirse posteriormente por una base de datos.
- [ ] No es necesario reescribir toda la lógica de autenticación para realizar dicha migración.

### Calidad del código

- [ ] Se reutilizó código existente cuando fue posible.
- [ ] No existe código innecesariamente duplicado.
- [ ] Las funciones tienen responsabilidades claras.
- [ ] Los archivos nuevos tienen comentarios explicativos.
- [ ] Los comentarios explican qué hace la funcionalidad, cómo funciona y por qué existe.
- [ ] Los nombres de archivos, variables y funciones son claros y consistentes con el proyecto.
- [ ] No se agregaron dependencias innecesarias.
- [ ] Las funcionalidades existentes continúan funcionando.

### Documentación

- [ ] Existe `REGISTRO_IMPLEMENTACION.md`.
- [ ] Se documentaron los archivos modificados.
- [ ] Se documentaron los archivos nuevos.
- [ ] Se explicó la función principal de cada archivo.
- [ ] Se documentó el flujo completo de registro.
- [ ] Se explicó cómo se implementó el almacenamiento TXT.
- [ ] Se explicó cómo realizar posteriormente la migración a una base de datos.

---

# 20. Verificación final obligatoria

Antes de considerar terminada la tarea, el modelo deberá revisar nuevamente el proyecto y comprobar **uno por uno** todos los elementos del checklist anterior.

No deberá declarar la implementación como terminada únicamente porque el código haya sido generado.

Debe verificar que:

```text
Código generado
       ↓
Código integrado
       ↓
Funcionalidad conectada
       ↓
Flujo completo probado
       ↓
Errores revisados
       ↓
Arquitectura revisada
       ↓
Documentación creada
       ↓
Checklist completado
```

Si algún punto del checklist no puede cumplirse, deberá indicarlo explícitamente y explicar:

1. Qué punto no se cumplió.
2. Por qué no se pudo cumplir.
3. Qué parte del proyecto lo impide.
4. Qué sería necesario para resolverlo.

**No marcar como completado un punto que únicamente fue supuesto o generado sin verificarlo.**