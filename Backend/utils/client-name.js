// How the History names a client: first name, else the display name ("Alexis opened the gallery").
export const clientName = (client) => client?.firstName?.trim() || client?.displayName?.trim() || 'The client';
