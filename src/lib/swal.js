/**
 * Wrappers de SweetAlert2 con el tema visual de la app.
 * Importar desde aquí en lugar de usar alert() / window.confirm() nativos.
 *
 * Uso:
 *   import { toast, confirm, alertError, alertSuccess } from '../lib/swal'
 *
 *   // Toast rápido (no bloquea)
 *   toast.success('¡Cita confirmada!')
 *   toast.error('No se pudo guardar')
 *   toast.info('Procesando...')
 *
 *   // Diálogo de confirmación (async, devuelve boolean)
 *   const ok = await confirm('¿Seguro?', 'Esta acción no se puede deshacer.')
 *   if (ok) { ... }
 *
 *   // Alertas grandes
 *   await alertSuccess('¡Listo!', 'Tu cita fue confirmada.')
 *   await alertError('Error', 'No se pudo conectar al servidor.')
 */

import Swal from 'sweetalert2'

// ─── Detectar si el DOM tiene la clase "dark" en <html> ──────────────────────

function isDark() {
  return document.documentElement.classList.contains('dark')
}

// ─── Paleta base que coincide con el diseño Tailwind de la app ───────────────

function baseConfig() {
  const dark = isDark()
  return {
    background:        dark ? '#111827' : '#ffffff',   // gray-900 / white
    color:             dark ? '#f9fafb' : '#111827',   // gray-50  / gray-900
    confirmButtonColor: dark ? '#f9fafb' : '#111827',  // gray-50  / gray-900
    cancelButtonColor:  dark ? '#374151' : '#e5e7eb',  // gray-700 / gray-200
    customClass: {
      popup:         'swal-popup',
      confirmButton: dark ? 'swal-btn-confirm-dark' : 'swal-btn-confirm-light',
      cancelButton:  dark ? 'swal-btn-cancel-dark'  : 'swal-btn-cancel-light',
      title:         'swal-title',
      htmlContainer: 'swal-text',
    },
  }
}

// ─── Toast (esquina inferior derecha, desaparece solo) ───────────────────────

const ToastBase = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (t) => {
    t.addEventListener('mouseenter', Swal.stopTimer)
    t.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

export const toast = {
  success: (message) =>
    ToastBase.fire({
      icon: 'success',
      title: message,
      ...baseConfig(),
    }),
  error: (message) =>
    ToastBase.fire({
      icon: 'error',
      title: message,
      timer: 4500,
      ...baseConfig(),
    }),
  warning: (message) =>
    ToastBase.fire({
      icon: 'warning',
      title: message,
      ...baseConfig(),
    }),
  info: (message) =>
    ToastBase.fire({
      icon: 'info',
      title: message,
      ...baseConfig(),
    }),
}

// ─── Diálogo de confirmación ─────────────────────────────────────────────────

/**
 * Muestra un diálogo de confirmación y devuelve `true` si el usuario confirmó.
 *
 * @param {string} title      Título del diálogo
 * @param {string} [text]     Texto secundario (opcional)
 * @param {object} [opts]     Opciones extra de SweetAlert2
 * @returns {Promise<boolean>}
 */
export async function confirm(title, text = '', opts = {}) {
  const result = await Swal.fire({
    title,
    text,
    icon: opts.icon ?? 'question',
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Sí, continuar',
    cancelButtonText:  opts.cancelText  ?? 'Cancelar',
    reverseButtons: true,
    focusCancel: true,
    ...baseConfig(),
    ...opts,
  })
  return result.isConfirmed
}

/**
 * Variante de confirmación destructiva (icono de advertencia rojo).
 */
export async function confirmDanger(title, text = '', opts = {}) {
  const dark = isDark()
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Sí, eliminar',
    cancelButtonText:  opts.cancelText  ?? 'Cancelar',
    confirmButtonColor: '#dc2626', // red-600
    cancelButtonColor:  dark ? '#374151' : '#e5e7eb',
    reverseButtons: true,
    focusCancel: true,
    ...baseConfig(),
    confirmButtonColor: '#dc2626',
    ...opts,
  })
  return result.isConfirmed
}

// ─── Alertas informativas ────────────────────────────────────────────────────

export function alertSuccess(title, text = '') {
  return Swal.fire({ title, text, icon: 'success', ...baseConfig() })
}

export function alertError(title, text = '') {
  return Swal.fire({ title, text, icon: 'error', ...baseConfig() })
}

export function alertWarning(title, text = '') {
  return Swal.fire({ title, text, icon: 'warning', ...baseConfig() })
}
