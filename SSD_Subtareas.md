# SSD – Funcionalidad de Subtareas

## 1. Nombre de la Funcionalidad

**Gestión de Subtareas**

## 2. Propósito

El propósito de esta funcionalidad es permitir a los usuarios dividir una tarea principal en actividades más pequeñas y manejables llamadas subtareas. Esto permite a los usuarios llevar un seguimiento más detallado del progreso de una tarea y determinar cuándo la tarea principal se ha completado por completo.

La funcionalidad fue incorporada a la lista de tareas existente sin modificar el proceso de creación de tareas principales.

## 3. Descripción de la Funcionalidad

La funcionalidad de Subtareas extiende el sistema de gestión de tareas existente.

Cada tarea principal puede contener múltiples subtareas. El usuario puede:

- Agregar una nueva subtarea a una tarea existente.
- Ver las subtareas asociadas a una tarea principal.
- Marcar subtareas individuales como completadas.
- Ver el progreso de las subtareas.
- Continuar agregando subtareas adicionales a la misma tarea principal.

El diseño representa las subtareas visualmente dentro de la tarjeta de su tarea principal correspondiente. La tarea original permanece como elemento padre, mientras que sus subtareas se muestran debajo de ella. El PDF documenta específicamente los estados para agregar subtareas y completarlas.

## 4. Diseño de Interfaz de Usuario

La funcionalidad fue diseñada para integrarse directamente en la interfaz existente de "Lista de Tareas".

Cada tarjeta de tarea contiene un botón **"+ Agregar subtarea"**. Este botón es el punto de partida para crear una subtarea.

### Estado inicial

Cuando una tarea no tiene subtareas, se muestra:

- Checkbox de la tarea.
- Nombre de la tarea.
- Fecha y hora de la tarea.
- Botón "+ Agregar subtarea".
- Botón de editar.
- Botón de eliminar.

El usuario no necesita navegar a otra página para crear una subtarea.

### Estado expandido

Cuando el usuario selecciona "Agregar subtarea", la tarjeta de la tarea se expande y muestra un área de entrada:

```
+ Agregar subtarea...
```

y un botón **Agregar**.

El usuario ingresa el nombre de la nueva subtarea y confirma la operación.

## 5. Flujo de Creación de Subtareas

El proceso de creación se puede representar de la siguiente manera:

```
Tarea Principal
    ↓
Click "+ Agregar subtarea"
    ↓
Mostrar campo de entrada de subtarea
    ↓
Ingresar nombre de la subtarea
    ↓
Click "Agregar"
    ↓
Crear subtarea
    ↓
Mostrar subtarea dentro de la tarea principal
```

Ejemplo:

```
Subir código de la práctica 2 al repositorio
│
├── Hacer commit de los cambios locales
│
└── Escribir mensaje de commit descriptivo
```

Esta estructura hace que la relación entre la tarea principal y sus subtareas sea visualmente clara.

## 6. Estructura de una Subtarea

Una subtarea se representa como un elemento de tarea más pequeño dentro de su tarea padre.

Cada subtarea contiene:

- Checkbox.
- Descripción de la subtarea.
- Opción de editar.
- Opción de eliminar.

Por lo tanto, la interfaz mantiene el mismo patrón de interacción utilizado para las tareas principales, diferenciando visualmente las subtareas por su posición y tamaño.

La jerarquía es:

```
Tarea
│
├── Subtarea 1
├── Subtarea 2
├── Subtarea 3
└── + Agregar subtarea
```

Esto permite que varias subtareas pertenezcan a una sola tarea principal.

## 7. Lógica de Completado

Una de las partes más importantes de la funcionalidad es la capacidad de completar subtareas de forma independiente.

Cuando el usuario selecciona el checkbox de una subtarea:

```
Subtarea pendiente
       ↓
Usuario marca el checkbox
       ↓
Subtarea completada
```

La interfaz cambia visualmente la subtarea completada mediante:

- Activación del checkbox.
- Aplicación de tachado al texto de la subtarea.
- Reducción de su énfasis visual.
- Manteniendo la subtarea completada dentro de la tarea padre.

Las capturas de pantalla muestran que las subtareas completadas permanecen visibles en lugar de desaparecer inmediatamente.

## 8. Representación del Progreso

El diseño también incorpora un indicador de progreso en la tarea principal.

Por ejemplo, cuando la tarea principal contiene dos subtareas, la interfaz puede mostrar un indicador como:

```
2 subtareas
```

junto con una barra de progreso.

El progreso cambia según el número de subtareas completadas.

Conceptualmente:

```
0 / 2 subtareas completadas
[----------]

1 / 2 subtareas completadas
[#####-----]

2 / 2 subtareas completadas
[##########]
```

Cuando todas las subtareas están completadas, la tarea principal también puede reflejar el estado de completado.

Esto crea una relación entre el estado de las subtareas y el progreso general de la tarea padre.

## 9. Completado de la Tarea Principal

El diseño soporta un comportamiento de completado jerárquico.

Por ejemplo:

```
Tarea Principal
   │
   ├── ✓ Subtarea 1
   └── ✓ Subtarea 2
```

Cuando todas las subtareas se han completado, la tarea principal puede considerarse totalmente completada.

Las capturas de pantalla muestran el estado final en el que ambas subtareas están marcadas y la tarea padre también se muestra como completada.

Esto significa que las subtareas aportan granularidad adicional sin reemplazar el estado original de la tarea.

## 10. Estados de Interacción

La funcionalidad fue diseñada con varios estados de interfaz.

**Estado 1 – Sin subtareas**
```
[ ] Tarea principal

    + Agregar subtarea
```

**Estado 2 – Agregando una subtarea**
```
[ ] Tarea principal

    + Agregar subtarea...
                         [Agregar]
```

**Estado 3 – Subtarea creada**
```
[ ] Tarea principal

    [ ] Subtarea 1
    + Agregar subtarea
```

**Estado 4 – Múltiples subtareas**
```
[ ] Tarea principal

    [ ] Subtarea 1
    [ ] Subtarea 2
    + Agregar subtarea
```

**Estado 5 – Una subtarea completada**
```
[ ] Tarea principal

    [✓] Subtarea 1
    [ ] Subtarea 2
    + Agregar subtarea
```

**Estado 6 – Todas las subtareas completadas**
```
[✓] Tarea principal

    [✓] Subtarea 1
    [✓] Subtarea 2
    + Agregar subtarea
```

## 11. Edición y Eliminación de Subtareas

El diseño también incorpora controles para gestionar una subtarea existente.

Cada subtarea tiene:

- Acción de editar.
- Acción de eliminar.

La funcionalidad de edición permite al usuario modificar la descripción de una subtarea existente, mientras que la acción de eliminar la remueve de su tarea padre.

Esto mantiene la consistencia con la interfaz de gestión de tareas existente, donde las tareas principales también tienen controles de editar y eliminar.

## 12. Modelo de Datos

Para implementar esta funcionalidad en el sistema, cada subtarea necesita mantener una relación con su tarea padre.

Una estructura simplificada sería:

```
TASK
-----
id
title
date
time
status

SUBTASK
-------
id
task_id
title
status
```

La relación importante es:

```
TASK 1 ──────────── N SUBTASK
```

Donde:

- `task_id` identifica a la tarea padre.
- Una tarea puede tener múltiples subtareas.
- Cada subtarea pertenece a una sola tarea principal.

Ejemplo:

```
Task
id = 15
title = "Subir código de la práctica 2 al repositorio"

        ↓

Subtasks

id | task_id | title
1  | 15      | Hacer commit de los cambios locales
2  | 15      | Escribir mensaje de commit descriptivo
```

## 13. Requisitos Funcionales

| ID | Requisito |
|----|-----------|
| FR-01 | El sistema deberá permitir al usuario agregar subtareas a una tarea existente. |
| FR-02 | El sistema deberá mostrar las subtareas dentro de su tarea padre. |
| FR-03 | El sistema deberá permitir múltiples subtareas para la misma tarea. |
| FR-04 | El sistema deberá permitir al usuario marcar una subtarea como completada. |
| FR-05 | El sistema deberá diferenciar visualmente las subtareas completadas. |
| FR-06 | El sistema deberá mostrar el progreso de las subtareas. |
| FR-07 | El sistema deberá permitir al usuario editar una subtarea. |
| FR-08 | El sistema deberá permitir al usuario eliminar una subtarea. |
| FR-09 | El sistema deberá asociar cada subtarea con su tarea principal correspondiente. |
| FR-10 | El sistema deberá actualizar el progreso de la tarea cuando una subtarea cambie de estado. |

## 14. Criterios de Aceptación

La funcionalidad puede considerarse correctamente implementada cuando:

- [ ] El usuario puede seleccionar "Agregar subtarea".
- [ ] Se muestra un campo de entrada.
- [ ] El usuario puede ingresar el nombre de la subtarea.
- [ ] El usuario puede guardar la nueva subtarea.
- [ ] La nueva subtarea aparece dentro de la tarea principal correcta.
- [ ] Se pueden agregar múltiples subtareas a la misma tarea.
- [ ] Cada subtarea tiene su propio checkbox.
- [ ] Una subtarea puede marcarse como completada de forma independiente.
- [ ] Las subtareas completadas se diferencian visualmente.
- [ ] El indicador de progreso se actualiza.
- [ ] El usuario puede editar una subtarea.
- [ ] El usuario puede eliminar una subtarea.
- [ ] Se preserva la relación entre la tarea principal y sus subtareas.

## 15. Esfuerzo Estimado

Según el documento del proyecto, Subtareas fue estimada en **200 minutos** de esfuerzo. Fue una de las tres nuevas funcionalidades seleccionadas para su implementación, junto con Inicio de Sesión y Recuperación de Contraseña.

---

## Resumen: La Idea Central del SSD

Lo más importante es que no se describa solamente "se agregó un botón de subtareas". El diseño realmente introduce una pequeña jerarquía dentro del sistema:

```
                    TASK
                     │
          ┌──────────┴──────────┐
          │                     │
      Subtask 1             Subtask 2
          │                     │
       Pending              Completed
          │                     │
          └──────────┬──────────┘
                     ↓
                Task Progress
```

Así se puede explicar que la funcionalidad se construyó extendiendo la tarjeta existente de una tarea, agregando el mecanismo para crear subtareas, mostrando esas subtareas dentro de la tarea padre, permitiendo administrar su estado individual y utilizando su estado para representar el progreso general.

> **Nota:** el PDF permite verificar estas pantallas y estados, pero no documenta todavía la implementación técnica concreta (por ejemplo, código, endpoints API, tablas reales o framework). Por eso, esa parte del SSD se deja como diseño técnico propuesto y no como algo ya implementado. El documento identifica explícitamente "Subtareas" como una nueva funcionalidad.
