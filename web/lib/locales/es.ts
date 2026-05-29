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

  wallet_profile: "Abrir perfil",
  wallet_wrong_network: "Red incorrecta",

  home_fan_id_mint_help:
    "Soulbound, uno por wallet. Gratis de emitir — solo gas.",
  home_prediction_acc: "Precisión de predicción",
  home_engagement: "Amplitud de participación",
  home_longevity: "Días como aficionado",

  quests_subtitle:
    "Misiones gratuitas on-chain que construyen tu reputación de aficionado. Sin comisiones sobre resultados, sin pagos — solo XP.",
  quests_filter_self_attest: "Autoverificación",
  quests_filter_prediction: "Predecir",
  quests_filter_external_proof: "Compartir",
  quests_xp_reward: "+{xp} XP",
  quests_action_commit: "Confirmar predicción",
  quests_action_submit_proof: "Enviar prueba",
  quests_action_view: "Ver",
  quests_empty: "Ninguna misión coincide con este filtro.",

  quest_mint_fanid_title: "Emite tu Fan ID",
  quest_mint_fanid_body: "Incorporación soulbound única.",
  quest_matchday_title: "Registro del día de partido",
  quest_matchday_body: "Confirma que viste el partido de hoy.",
  quest_predict_score_title: "Predice el marcador",
  quest_predict_score_body:
    "Confirma un hash antes del inicio; el XP escala según la cercanía.",
  quest_team_profile_title: "Completa el perfil de tu selección",
  quest_team_profile_body: "Añade tus selecciones favoritas y tu idioma.",
  quest_daily_fact_title: "Dato diario del partido",
  quest_daily_fact_body: "Lee tres datos sobre el partido de hoy.",
  quest_share_post_title: "Comparte una publicación de aficionado",
  quest_share_post_body: "Pega una URL de X que etiquete al proyecto.",
  quest_group_streak_title: "Racha de fase de grupos",
  quest_group_streak_body: "Regístrate cada día de la fase de grupos.",
  quest_deploy_agent_title: "Despliega tu agente",
  quest_deploy_agent_body:
    "Registra un agente de IA e inscríbelo en la temporada activa de la Liga de Agentes.",
  quest_group_stage_streak_title: "Racha de fase de grupos",
  quest_group_stage_streak_body:
    "Completa la misión diaria cada día de la fase de grupos del grupo de tu selección.",
  quest_deploy_your_agent_title: "Despliega tu agente",
  quest_deploy_your_agent_body:
    "Registra un agente de IA en AgentRegistry e inscríbelo en la temporada activa de AgentLeague.",

  trophies_subtitle:
    "Conmemorativos deterministas. Suministro fijo. Nunca aleatorios, nunca pagados.",
  trophies_progress: "{have}/{need} XP",
  trophies_supply: "{minted}/{cap} emitidos",
  trophy_first_whistle_name: "Primer Silbato",
  trophy_first_whistle_desc:
    "Emite tu Fan ID y completa tu primer registro del día de partido.",
  trophy_first_whistle_cond: "Fan ID + 1 misión del día de partido",
  trophy_group_survivor_name: "Superviviente de la Fase de Grupos",
  trophy_group_survivor_desc:
    "Regístrate cada día de la fase de grupos del grupo de tu selección.",
  trophy_group_survivor_cond: "Completa la misión de racha",
  trophy_pollster_name: "Pronosticador",
  trophy_pollster_desc: "Completa 10 predicciones.",
  trophy_pollster_cond: "10 misiones de predicción liquidadas",
  trophy_sharpshooter_name: "Francotirador",
  trophy_sharpshooter_desc:
    "Precisión de predicción ≥ 60% en al menos 20 predicciones.",
  trophy_sharpshooter_cond: "predictionAccuracyBps ≥ 6000, n ≥ 20",
  trophy_ai_champion_name: "Campeón de IA",
  trophy_ai_champion_desc:
    "Tu agente termina en lo más alto de una temporada de la Liga de Agentes.",
  trophy_ai_champion_cond: "Líder de la clasificación al cierre de temporada",
  trophy_knockout_name: "Testigo de Eliminatorias",
  trophy_knockout_desc:
    "Registro del día de partido en cada día de octavos, cuartos, semifinales y la Final.",
  trophy_knockout_cond: "Los cuatro registros de las rondas eliminatorias",
  trophy_champion_of_champions_name: "Campeón de Campeones",
  trophy_champion_of_champions_desc:
    "Tu selección favorita gana el torneo (liquidado por el Optimistic Oracle).",
  trophy_champion_of_champions_cond:
    "La selección favorita gana la Final, por liquidación del OO",

  companion_subtitle:
    "Habla con un informe de IA multiagente — analista del partido, tus estadísticas personales y resúmenes pospartido, compuestos en una sola llamada on-chain.",
  companion_pick_agents: "Elegir agentes",
  companion_compose_label: "Componer llamada",
  companion_input_placeholder:
    "Pregunta sobre el partido de hoy, una selección o un jugador…",
  companion_total_cost: "Coste total",
  companion_demo_notice:
    "Modo demo — conéctate en una red desplegada para hacer la llamada on-chain.",
  companion_thinking: "Componiendo respuesta…",
  companion_offline_reply:
    "(Respuesta demo) Una vez desplegado AgentRegistry, aquí aparecerá el informe multiagente compuesto.",
  agent_match_analyst_name: "Analista del Partido",
  agent_match_analyst_desc:
    "Previa del partido: forma, estadísticas clave, cara a cara, alineaciones.",
  agent_personal_stats_name: "Estadísticas Personales",
  agent_personal_stats_desc:
    "Lee tu Reputación de Aficionado y sugiere la próxima misión de mayor valor.",
  agent_highlights_name: "Resúmenes",
  agent_highlights_desc: "Resumen pospartido y momentos clave, multilingüe.",

  league_subtitle:
    "Trae tu propio agente. Cualquiera puede desplegar una IA en X Layer y competir por el trofeo de Campeón de IA. Habilidad gratuita, sin dinero sobre resultados.",
  league_season_active: "Temporada {id} · en vivo",
  league_season_closed: "Temporada {id} · cerrada",
  league_season_none: "Sin temporada activa",
  league_standings_rank: "Puesto",
  league_standings_agent: "Agente",
  league_standings_score: "Puntuación",
  league_standings_owner: "Propietario",
  league_empty: "Aún no hay agentes inscritos.",
  league_how_title: "Cómo funciona",
  league_how_step1:
    "Registra tu agente en AgentRegistry — endpoint, wallet, precio por llamada.",
  league_how_step2:
    "Inscríbelo en la temporada activa con enterAgent(agentId).",
  league_how_step3:
    "Cada misión de tipo predicción acepta predicciones confirmadas con hash de los agentes.",
  league_how_step4:
    "Tras la liquidación del Optimistic Oracle, cualquiera puntúa la revelación de tu agente.",
  league_how_step5:
    "El agente mejor clasificado al cierre de temporada reclama el trofeo de Campeón de IA.",

  leaderboard_subtitle:
    "Tu Reputación de Aficionado on-chain — XP, precisión de predicción y amplitud, leídos en vivo desde FanRep.",
  leaderboard_col_rank: "#",
  leaderboard_col_fan: "Aficionado",
  leaderboard_col_xp: "XP",
  leaderboard_col_accuracy: "Prec. predic.",
  leaderboard_col_breadth: "Amplitud",
  leaderboard_empty:
    "Cuando los aficionados empiecen a completar misiones, la clasificación se llenará aquí.",

  profile_title: "Perfil de aficionado",
  profile_no_fan_id: "Esta wallet aún no ha emitido un Fan ID.",
  profile_favorite_teams: "Selecciones favoritas",
  profile_xp_breakdown: "Desglose de XP",
  profile_dim_prediction: "Precisión de predicción",
  profile_dim_engagement: "Participación",
  profile_dim_longevity: "Antigüedad",
  profile_dim_agent_league: "Liga de Agentes",
  profile_dim_donor: "Donante",
  profile_activity: "Actividad",
  profile_activity_empty: "Aún no hay actividad registrada.",
  profile_activity_fan_minted: "Fan ID emitido",
  profile_activity_quest_completed: "{quest} completada",
  profile_activity_agent_xp: "XP de la Liga de Agentes registrado",
  profile_share: "Compartir perfil",
  profile_view_on_explorer: "Ver en OKLink",

  team_overview: "Resumen",
  team_all_teams: "Todas las selecciones",

  quests_stat_live: "En vivo",
  quests_stat_upcoming: "Próximas",
  quests_stat_total: "Total",

  tracks_heading: "Tres formas de jugar",
  tracks_social_label: "01 · SOCIAL",
  tracks_social_headline: "Una reputación de aficionado de verdad tuya",
  tracks_social_desc:
    "Elige tus selecciones, completa misiones gratuitas y construye una reputación que nadie puede comprar ni falsear — tu precisión de predicción, tu amplitud, tu lealtad con el tiempo. Vive en tu wallet, no en nuestro servidor.",
  tracks_social_feature1: "Un Fan ID gratuito por wallet — tuyo para siempre",
  tracks_social_feature2: "Cada misión que terminas es una transacción real",
  tracks_social_feature3: "Tu puntuación es pública y portable en todo X Layer",
  tracks_social_cta: "Empieza tus misiones",
  tracks_nft_label: "02 · NFT",
  tracks_nft_headline: "Trofeos que ganas, nunca compras",
  tracks_nft_desc:
    "Trofeos conmemorativos que desbloqueas al alcanzar hitos reales — acertar la fase de grupos, mantener una racha de predicciones, levantar la copa con tu selección. Nunca aleatorios, nunca pagados, nunca una caja sorpresa. Recláma­los por gas y consérvalos para siempre.",
  tracks_nft_feature1: "Desbloqueados por hitos reales, no por suerte",
  tracks_nft_feature2: "Solo gas para reclamar — sin comisiones, sin sobres",
  tracks_nft_feature3: "Tuyos para conservar, uno por aficionado",
  tracks_nft_cta: "Ver la sala de trofeos",
  tracks_ai_label: "03 · AGENTE DE IA",
  tracks_ai_headline: "Crea un bot, entra en la liga",
  tracks_ai_desc:
    "Crea tu propio agente de IA e introdúcelo en un torneo de predicción gratuito y de pura habilidad contra los de todos los demás — y nuestros tres asistentes. Lo más alto de la tabla levanta el trofeo de Campeón de IA. La liga está abierta a cualquiera que sepa programar.",
  tracks_ai_feature1: "Cualquiera puede desplegar y entrar — sin barreras",
  tracks_ai_feature2: "Entrada gratuita; predice, revela y puntúa cada ronda",
  tracks_ai_feature3: "Gana la temporada, reclama el trofeo de Campeón de IA",
  tracks_ai_cta: "Inscribe tu agente",

  how_heading: "Cómo funciona Kickoff",
  how_step_aria: "Paso {numeral}",
  how_step1_title: "Conecta OKX Wallet",
  how_step1_subtitle:
    "OKB paga el gas. Sin depósitos, sin registros, sin custodia.",
  how_step2_title: "Emite tu Fan ID",
  how_step2_subtitle:
    "Un SBT soulbound por wallet. Gratis, solo gas, no transferible.",
  how_step3_title: "Completa misiones",
  how_step3_subtitle:
    "Mira partidos, predice marcadores, comparte publicaciones. Cada acción gana XP on-chain.",
  how_step4_title: "Gana trofeos, ejecuta agentes",
  how_step4_subtitle:
    "Reclama conmemorativos ERC-1155. Despliega tu propio agente de IA en la liga.",

  proof_heading: "Verificable en la cadena",
  proof_intro:
    "Cada transacción de abajo está en la testnet de X Layer. Haz clic para ver el recibo en OKLink.",
  proof_open_season:
    "La Temporada 1 está activa y acepta inscripciones de agentes.",
  proof_submit_prediction:
    "Una predicción de marcador confirmada con hash publicada antes del inicio.",
  proof_score_prediction:
    "Revelación tras la liquidación del OptimisticOracle. +1000 XP.",
  proof_match_analyst:
    "Previa real del partido escrita on-chain por Claude Haiku 4.5.",
  proof_personal_stats:
    "Estadísticas de XP de FanRep del llamante y respuesta de entrenamiento, on-chain.",
  proof_highlights:
    "Resumen pospartido basado únicamente en los datos suministrados.",

  cta_eyebrow: "En vivo en la testnet de X Layer",
  cta_headline: "Emite tu Fan ID. Ejecuta un agente. Mira la liga.",
  cta_subhead: "Tres pistas de la OKX X Cup. Una plataforma. Sin apuestas.",
  cta_browse_quests: "Explorar misiones",
  cta_fork_agent: "Bifurca el agente BYO",
  cta_footnote:
    "Misiones gratuitas · Entrada gratuita a la liga · OKB solo para comisiones de servicio de agentes",

  arch_heading: "La arquitectura de un vistazo",
  arch_intro:
    "Cinco nuevos contratos v2 más un oráculo optimista con fianza reutilizado, todos en la testnet 1952 de X Layer.",
  arch_diagram_aria: "Diagrama de la arquitectura de contratos",
  arch_tile_wallet: "OKX Wallet",
  arch_tile_wallet_sub: "Gas en OKB",
  arch_tile_web: "web",
  arch_tile_web_sub: "Next.js",
  arch_tile_oracle: "OptimisticOracle",
  arch_tile_oracle_sub: "reutilizado, con fianza",
  arch_tile_keeper: "Keeper",
  arch_tile_keeper_sub: "openfootball / API-FOOTBALL",
  arch_fanrep_blurb:
    "ERC-721 soulbound + reputación multidimensional (score(address)).",
  arch_questengine_blurb:
    "SELF_ATTEST / PREDICTION (commit-reveal) / EXTERNAL_PROOF.",
  arch_trophy_blurb:
    "Conmemorativos ERC-1155. Acceso determinista. Sin aleatoriedad.",
  arch_agentregistry_blurb:
    "Agentes sin permisos. OKB por llamada. Difusión composeAgents.",
  arch_agentleague_blurb:
    "Temporadas Bring-Your-Own-Agent. Commit-reveal. Trofeo de Campeón de IA.",
  arch_view_contracts: "Ver contratos en OKLink",

  faq_heading: "Preguntas frecuentes",
  faq_q1: "¿Esto es dinero real o dinero ficticio?",
  faq_a1:
    "Dinero ficticio. No hay cuotas de entrada contra un resultado, ni pagos ligados a predicciones, ni mercados de apuestas. Las misiones son gratuitas. El Asistente cobra una pequeña comisión por llamada en OKB por el servicio en sí, con un nivel gratuito siempre disponible.",
  faq_q2: "¿Necesito cripto para probar Kickoff?",
  faq_a2:
    "Necesitas una wallet EVM (OKX Wallet funciona mejor) y una pequeña cantidad de OKB de testnet para el gas. El enlace al faucet en la cabecera te da el OKB gratis; todo lo demás es solo hacer clic y firmar.",
  faq_q3: "¿Qué significa aquí “halal por diseño”?",
  faq_a3:
    "Tres reglas de ingeniería: sin cuotas de entrada contra un resultado, sin pagos ligados a predicciones, sin emisiones aleatorias. El propio código on-chain no contiene primitivas de apuestas — solo Fan ID, misiones, trofeos, agentes y un oráculo de tipo verificador que dice “el resultado de este partido fue X”.",
  faq_q4: "¿Qué es una liga Bring-Your-Own-Agent?",
  faq_a4:
    "Un torneo de habilidad gratuito para agentes de IA en X Layer. Cualquiera puede registrar un agente (su backend, su LLM, su lógica), inscribirlo en la temporada activa, confirmar predicciones antes del inicio y revelarlas después. El propietario del agente mejor clasificado emite el trofeo de Campeón de IA. Sin dinero que entra ni que sale — solo reputación.",
  faq_q5: "¿Qué es X Layer y por qué usarlo?",
  faq_a5:
    "X Layer es la L2 OP Stack de OKX. El gas se paga en OKB. Transacciones de menos de un céntimo, OKX Wallet funciona de forma nativa, OKLink para prueba verificable. Kickoff convierte el pico de atención del Mundial en transacciones reales on-chain en X Layer.",
  faq_q6: "¿Dónde veo la prueba on-chain?",
  faq_a6:
    "Cada acción que cambia el estado — emisión, completar misión, confirmar/revelar predicción, llamada a un agente, reclamar trofeo — emite un evento enlazado al explorador público OKLink. La sección “Verificable en la cadena” de arriba lista seis transacciones representativas de esta build.",

  common_loading: "Cargando…",
  common_error: "Algo salió mal.",
  common_demo_banner:
    "Modo demo — los contratos aún no están desplegados. Los números de abajo son marcadores de posición.",
  common_connect_first: "Conecta tu wallet para continuar.",
  common_view: "Ver",
};
