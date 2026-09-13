import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * =============================================================================
 * GUARDIANES DE RUTA
 * -----------------------------------------------------------------------------
 * PASO 4 del plan de implementacion.
 *
 * Un guardian es una funcion que el router ejecuta ANTES de activar una ruta.
 * Si devuelve true la navegacion continua; si devuelve un UrlTree, el router
 * redirige a esa otra ruta.
 *
 * Se usan guardianes funcionales (CanActivateFn) y no clases porque es la forma
 * recomendada desde Angular 15 y no requiere registrar nada como provider: las
 * dependencias se obtienen con inject().
 *
 * ADVERTENCIA IMPORTANTE
 * Un guardian de ruta NO es un mecanismo de seguridad. Solo evita que se
 * muestre una pantalla; el codigo y los datos siguen estando en el navegador y
 * cualquiera puede saltarselo editando localStorage desde la consola. La
 * seguridad real la aplica el servidor al rechazar peticiones sin credenciales
 * validas, y este proyecto todavia no tiene servidor.
 * =============================================================================
 */

/**
 * Protege /tareas: si no hay sesion abierta, devuelve al login.
 *
 * Se guarda la URL de destino en el parametro de consulta `redirectTo`, para
 * que despues de iniciar sesion el usuario acabe donde queria ir y no siempre
 * en la pantalla por defecto.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url }
  });
};

/**
 * El caso contrario: protege las pantallas de invitado (/login, /recuperar).
 *
 * Sin esto, un usuario con la sesion abierta podria volver al formulario de
 * inicio de sesion, lo que resulta confuso. Nota que /restablecer queda fuera
 * a proposito: cambiar la contrasena debe ser posible tambien con la sesion
 * abierta, y de hecho resetPassword() cierra la sesion al terminar.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/tareas']);
};
