/**
 * Traduzione dei messaggi di errore di Supabase Auth in italiano.
 * Funzione pura, utilizzabile anche nei Client Component.
 */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "Email o password non corretti.";
  }
  if (m.includes("email not confirmed")) {
    return "Devi prima confermare la tua email: controlla la casella di posta (anche lo spam).";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Esiste già un account con questa email. Prova ad accedere o a reimpostare la password.";
  }
  if (m.includes("password should be at least")) {
    return "La password deve contenere almeno 8 caratteri.";
  }
  if (m.includes("weak password")) {
    return "La password è troppo debole: usa almeno 8 caratteri.";
  }
  if (m.includes("email address is invalid") || m.includes("invalid email")) {
    return "L'indirizzo email non è valido.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Troppi tentativi ravvicinati: riprova tra qualche minuto.";
  }
  if (m.includes("fetch") || m.includes("network")) {
    return "Errore di rete: verifica la connessione e riprova.";
  }
  if (m.includes("same password")) {
    return "La nuova password deve essere diversa da quella attuale.";
  }
  return "Si è verificato un errore inatteso. Riprova tra qualche istante.";
}
