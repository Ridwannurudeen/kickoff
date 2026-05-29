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
  leaderboard_your_standing: "Tu posición",
  leaderboard_connect: "Conecta tu wallet para ver tu posición on-chain.",
  leaderboard_no_fanid:
    "Emite tu Fan ID para empezar a construir tu reputación.",
  leaderboard_global_title: "Clasificación global",
  leaderboard_filter_all: "Todos los aficionados",
  leaderboard_team_empty: "Aún no hay aficionados apoyando a esta selección.",

  quests_pick_home: "Local",
  quests_pick_draw: "Empate",
  quests_pick_away: "Visitante",
  quests_action_commit_pick: "Confirmar pronóstico",
  quests_committed: "Confirmado",
  quests_action_reveal: "Revelar y reclamar",
  quests_result_pending:
    "El resultado aún no se ha liquidado — vuelve tras el partido.",
  quests_reveal_other_device:
    "Revela desde el dispositivo donde lo confirmaste.",
  leaderboard_global_note:
    "El XP de cada aficionado ya está on-chain. La clasificación global pública llega con el indexador de eventos — en el roadmap.",

  team_group_label: "Grupo {group}",
  team_group_table: "Tabla del grupo",
  team_fixtures: "Partidos",
  team_quests_title: "Misiones de esta selección",
  team_no_quests: "Aún no hay misiones activas para esta selección.",

  quest_predict_match_title: "Predice el partido",
  quest_predict_match_body:
    "Acierta el resultado antes del inicio — la precisión sube tu puntuación de predicción.",
  quest_attend_match_title: "Registro del día de partido",
  quest_attend_match_body:
    "Regístrate durante el partido para ganar XP de participación.",
};
