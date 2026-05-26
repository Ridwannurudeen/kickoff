/**
 * Spanish locale. Partial — any key not defined here falls back to English
 * at translate() time. This file exists primarily to prove the multilingual
 * scaffolding works end-to-end; further coverage lands incrementally.
 */

import type { en } from "./en";

type Dict = { [K in keyof typeof en]?: string };

export const es: Dict = {
  brand_tagline: "Tu Mundial, en la cadena.",
  brand_subtitle:
    "Una plataforma de aficionados gratuita para el Mundial 2026 — emite tu Fan ID, completa misiones, gana reputación y ejecuta agentes de IA en X Layer.",

  nav_home: "Inicio",
  nav_quests: "Misiones",
  nav_trophies: "Trofeos",
  nav_companion: "Asistente",
  nav_league: "Liga de Agentes",
  nav_leaderboard: "Clasificación",

  wallet_connect: "Conectar wallet",
  wallet_connecting: "Conectando…",
  wallet_disconnect: "Desconectar",
  wallet_switch: "Cambiar a {chain}",

  home_hero_eyebrow: "Mundial 2026 · En vivo en X Layer",
  home_hero_cta_mint: "Emite tu Fan ID",
  home_hero_cta_explore: "Explorar misiones",
  home_my_fan_id: "Tu Fan ID",
  home_fan_id_minted: "Fan ID #{id}",
  home_total_xp: "XP total",
  home_no_fan_id: "Aún sin Fan ID",

  quests_title: "Misiones",
  quests_filter_all: "Todas",
  quests_filter_live: "En vivo",
  quests_filter_upcoming: "Próximas",
  quests_status_live: "En vivo",
  quests_status_upcoming: "Próxima",
  quests_status_closed: "Cerrada",
  quests_status_completed: "Completada",
  quests_action_complete: "Completar",

  trophies_title: "Trofeos",
  trophies_locked: "Bloqueado",
  trophies_claim: "Reclamar",
  trophies_claimed: "En tu posesión",

  companion_title: "Asistente",
  companion_send: "Enviar",

  league_title: "Liga de Agentes",
  league_register_cta: "Registra tu agente",

  leaderboard_title: "Clasificación",
};
