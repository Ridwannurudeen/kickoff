/**
 * English source-of-truth dictionary. Every translation key in the app
 * must exist here; other locales inherit any missing key by falling back
 * to this file at runtime.
 */

export const en = {
  // brand
  brand_tagline: "Your World Cup, on-chain.",
  brand_subtitle:
    "Back your nation. Call the upsets. Earn your place. A free World Cup 2026 fan platform where every quest, prediction, and trophy is really yours — on X Layer.",

  // nav
  nav_home: "Home",
  nav_schedule: "Schedule",
  nav_quests: "Quests",
  nav_trophies: "Trophies",
  nav_companion: "Companion",
  nav_league: "Agent League",
  nav_leaderboard: "Leaderboard",

  // wallet
  wallet_connect: "Connect Wallet",
  wallet_connecting: "Connecting…",
  wallet_disconnect: "Disconnect",
  wallet_profile: "Open profile",
  wallet_wrong_network: "Wrong network",
  wallet_switch: "Switch to {chain}",

  // home
  home_hero_eyebrow: "World Cup 2026 · Live on X Layer",
  home_hero_cta_mint: "Mint your Fan ID",
  home_hero_cta_schedule: "See the schedule",
  home_kickoff_in: "Kickoff in",
  home_kickoff_live: "The cup is live",
  home_next_matches: "Next matches",
  home_full_schedule: "Full schedule",
  home_fact_teams: "Teams",
  home_fact_matches: "Matches",
  home_fact_cities: "Host cities",
  home_fact_nations: "Host nations",
  home_my_fan_id: "Your Fan ID",
  home_fan_id_mint_help: "Soulbound, one per wallet. Free to mint — gas only.",
  home_fan_id_minted: "Fan ID #{id}",
  home_total_xp: "Total XP",
  home_prediction_acc: "Prediction accuracy",
  home_engagement: "Engagement breadth",
  home_longevity: "Days as a fan",
  home_no_fan_id: "No Fan ID yet",

  // quests
  quests_title: "Quests",
  quests_subtitle:
    "Free, on-chain quests that build your fan reputation. No fees on outcomes, no payouts — XP only.",
  quests_filter_all: "All",
  quests_filter_live: "Live",
  quests_filter_upcoming: "Upcoming",
  quests_filter_self_attest: "Self-attest",
  quests_filter_prediction: "Predict",
  quests_filter_external_proof: "Share",
  quests_status_live: "Live",
  quests_status_upcoming: "Upcoming",
  quests_status_closed: "Closed",
  quests_status_completed: "Completed",
  quests_xp_reward: "+{xp} XP",
  quests_action_complete: "Complete",
  quests_action_commit: "Commit prediction",
  quests_action_submit_proof: "Submit proof",
  quests_action_view: "View",
  quests_empty: "No quests match this filter.",

  // quest catalogue
  quest_predict_match_title: "Predict the match",
  quest_predict_match_body:
    "Call the result before kickoff — accuracy builds your prediction score.",
  quest_attend_match_title: "Match-day check-in",
  quest_attend_match_body: "Check in during the match to earn engagement XP.",
  quest_mint_fanid_title: "Mint your Fan ID",
  quest_mint_fanid_body: "One-time soulbound onboarding.",
  quest_matchday_title: "Match-day check-in",
  quest_matchday_body: "Attest that you watched today's match.",
  quest_predict_score_title: "Predict the score",
  quest_predict_score_body:
    "Commit a hash before kickoff; XP scales with closeness.",
  quest_team_profile_title: "Complete your team profile",
  quest_team_profile_body: "Add favorite teams and your language.",
  quest_daily_fact_title: "Daily match fact",
  quest_daily_fact_body: "Read three facts about today's fixture.",
  quest_share_post_title: "Share a fan post",
  quest_share_post_body: "Paste an X URL that tags the project.",
  quest_group_streak_title: "Group-stage streak",
  quest_group_streak_body: "Check in on every day of group stage.",
  quest_deploy_agent_title: "Deploy your agent",
  quest_deploy_agent_body:
    "Register an AI agent and enter it into the active Agent League season.",
  quest_group_stage_streak_title: "Group-stage streak",
  quest_group_stage_streak_body:
    "Complete the daily quest every day of group stage in your team's group.",
  quest_deploy_your_agent_title: "Deploy your agent",
  quest_deploy_your_agent_body:
    "Register an AI agent in AgentRegistry and enter it in the active AgentLeague season.",

  // trophies
  trophies_title: "Trophies",
  trophies_subtitle:
    "Deterministic commemoratives. Fixed supply. Never random, never paid.",
  trophies_locked: "Locked",
  trophies_claim: "Claim",
  trophies_claimed: "Owned",
  trophies_progress: "{have}/{need} XP",
  trophies_supply: "{minted}/{cap} minted",
  trophy_first_whistle_name: "First Whistle",
  trophy_first_whistle_desc:
    "Mint your Fan ID and complete your first match-day check-in.",
  trophy_first_whistle_cond: "Fan ID + 1 match-day quest",
  trophy_group_survivor_name: "Group Stage Survivor",
  trophy_group_survivor_desc:
    "Check in on every day of group stage for your team's group.",
  trophy_group_survivor_cond: "Complete the streak quest",
  trophy_pollster_name: "Pollster",
  trophy_pollster_desc: "Complete 10 predictions.",
  trophy_pollster_cond: "10 prediction quests settled",
  trophy_sharpshooter_name: "Sharpshooter",
  trophy_sharpshooter_desc:
    "Prediction accuracy ≥ 60% over at least 20 predictions.",
  trophy_sharpshooter_cond: "predictionAccuracyBps ≥ 6000, n ≥ 20",
  trophy_ai_champion_name: "AI Champion",
  trophy_ai_champion_desc:
    "Your agent finishes top-ranked in an Agent League season.",
  trophy_ai_champion_cond: "Top of leaderboard at season close",
  trophy_knockout_name: "Knockout Witness",
  trophy_knockout_desc:
    "Match-day check-in on every R16, QF, SF and Final day.",
  trophy_knockout_cond: "All four knockout-round check-ins",
  trophy_champion_of_champions_name: "Champion of the Champions",
  trophy_champion_of_champions_desc:
    "Your favorite team wins the tournament (settled by the Optimistic Oracle).",
  trophy_champion_of_champions_cond:
    "Favorite team wins the Final, by OO settlement",

  // companion
  companion_title: "Companion",
  companion_subtitle:
    "Talk to a multi-agent AI briefing — match analyst, your personal stats, and post-match highlights, composed in one on-chain call.",
  companion_pick_agents: "Pick agents",
  companion_compose_label: "Compose call",
  companion_input_placeholder:
    "Ask about today's fixture, a team, or a player…",
  companion_send: "Send",
  companion_total_cost: "Total cost",
  companion_demo_notice:
    "Demo mode — connect on a deployed network to make the on-chain call.",
  companion_thinking: "Composing reply…",
  companion_offline_reply:
    "(Demo reply) Once the AgentRegistry is deployed, this is where the composed multi-agent briefing will appear.",
  agent_match_analyst_name: "Match Analyst",
  agent_match_analyst_desc:
    "Pre-match preview: form, key stats, head-to-head, lineups.",
  agent_personal_stats_name: "Personal Stats",
  agent_personal_stats_desc:
    "Reads your Fan Reputation and suggests the highest-value next quest.",
  agent_highlights_name: "Highlights",
  agent_highlights_desc: "Post-match summary and key moments, multilingual.",

  // league
  league_title: "Agent League",
  league_subtitle:
    "Bring your own agent. Anyone can deploy an AI to X Layer and compete for the AI Champion trophy. Free skill, no money on outcomes.",
  league_register_cta: "Register your agent",
  league_season_active: "Season {id} · live",
  league_season_closed: "Season {id} · closed",
  league_season_none: "No active season",
  league_standings_rank: "Rank",
  league_standings_agent: "Agent",
  league_standings_score: "Score",
  league_standings_owner: "Owner",
  league_empty: "No agents entered yet.",
  league_how_title: "How it works",
  league_how_step1:
    "Register your agent in AgentRegistry — endpoint, wallet, price per call.",
  league_how_step2: "Enter it into the active season with enterAgent(agentId).",
  league_how_step3:
    "Each prediction-type quest accepts hash-committed predictions from agents.",
  league_how_step4:
    "After the Optimistic Oracle settles, anyone scores your agent's reveal.",
  league_how_step5:
    "Top-ranked agent at season close claims the AI Champion trophy.",

  // leaderboard
  leaderboard_title: "Leaderboard",
  leaderboard_subtitle:
    "Your on-chain Fan Reputation — XP, prediction accuracy, and breadth, read live from FanRep.",
  leaderboard_your_standing: "Your standing",
  leaderboard_connect: "Connect your wallet to see your on-chain standing.",
  leaderboard_no_fanid: "Mint your Fan ID to start building your reputation.",
  leaderboard_global_title: "Global ranking",
  leaderboard_global_note:
    "Every fan's XP is on-chain today. A public global ranking lands with the events indexer — tracked on the roadmap.",
  leaderboard_col_rank: "#",
  leaderboard_col_fan: "Fan",
  leaderboard_col_xp: "XP",
  leaderboard_col_accuracy: "Prediction acc.",
  leaderboard_col_breadth: "Breadth",
  leaderboard_empty:
    "Once fans start completing quests, the leaderboard will fill in here.",

  // profile
  profile_title: "Fan profile",
  profile_no_fan_id: "This wallet hasn't minted a Fan ID yet.",
  profile_favorite_teams: "Favorite teams",
  profile_xp_breakdown: "XP breakdown",
  profile_dim_prediction: "Prediction accuracy",
  profile_dim_engagement: "Engagement",
  profile_dim_longevity: "Longevity",
  profile_dim_agent_league: "Agent League",
  profile_dim_donor: "Donor",
  profile_activity: "Activity",
  profile_activity_empty: "No tracked activity yet.",
  profile_activity_fan_minted: "Fan ID minted",
  profile_activity_quest_completed: "{quest} completed",
  profile_activity_agent_xp: "Agent League XP recorded",
  profile_share: "Share profile",
  profile_view_on_explorer: "View on OKLink",

  // schedule
  schedule_title: "Match schedule",
  schedule_subtitle:
    "All 104 fixtures of World Cup 2026 — 12 groups, then the road to the Final.",
  schedule_tab_fixtures: "Fixtures",
  schedule_tab_groups: "Groups",
  schedule_group_label: "Group {group}",

  // team page
  team_overview: "Overview",
  team_group_label: "Group {group}",
  team_fixtures: "Fixtures",
  team_group_table: "Group table",
  team_quests_title: "Quests anchored to this team",
  team_no_quests: "No active quests for this team yet.",

  // common
  common_loading: "Loading…",
  common_error: "Something went wrong.",
  common_demo_banner:
    "Demo mode — contracts aren't deployed yet. Numbers below are placeholders.",
  common_connect_first: "Connect your wallet to continue.",
  common_view: "View",
} as const;
