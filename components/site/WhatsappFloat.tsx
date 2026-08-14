import { waUrl } from "@/lib/site";

export function WhatsappFloat() {
  return (
    <a
      className="wa-float"
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Reserva por WhatsApp"
      aria-label="Reserva por WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="32" height="32" fill="#ffffff" aria-hidden="true">
        <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.1 4c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s.9 2.6 1 2.7c.2.2 1.8 2.8 4.4 3.8 2.1.9 2.6.7 3 .7.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.6-.7c.1-.2.1-.3.2-.5v-.5L10 8.2c-.2-.4-.4-.4-.6-.4h-.5Z" />
      </svg>
    </a>
  );
}
