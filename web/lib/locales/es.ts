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
    "Apoya a tu selección. Acierta las sorpresas. Gánate tu lugar. Una plataforma de aficionados gratuita para el Mundial 2026 donde cada misión, predicción y trofeo es de verdad tuyo — en X Layer.",

  nav_home: "Inicio",
  nav_schedule: "Calendario",
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
  home_hero_cta_schedule: "Ver el calendario",
  home_kickoff_in: "El balón rueda en",
  home_kickoff_live: "El Mundial está en vivo",
  home_next_matches: "Próximos partidos",
  home_full_schedule: "Calendario completo",
  home_fact_teams: "Selecciones",
  home_fact_matches: "Partidos",
  home_fact_cities: "Sedes",
  home_fact_nations: "Países anfitriones",
  home_my_fan_id: "Tu Fan ID",
  home_fan_id_minted: "Fan ID #{id}",
  home_total_xp: "XP total",
  home_no_fan_id: "Aún sin Fan ID",

  schedule_title: "Calendario de partidos",
  schedule_subtitle:
    "Los 104 partidos del Mundial 2026 — 12 grupos y luego el camino a la Final.",
  schedule_tab_fixtures: "Partidos",
  schedule_tab_groups: "Grupos",
  schedule_group_label: "Grupo {group}",

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
