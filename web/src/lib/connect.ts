export function callUrl(phone: string): string | null {
  return /^\+[1-9]\d{7,14}$/.test(phone) ? `tel:${phone}` : null
}
export function whatsappUrl(phone: string): string | null {
  return callUrl(phone) ? `https://wa.me/${phone.slice(1)}` : null
}
