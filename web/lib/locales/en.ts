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
  quests_pick_home: "Home",
  quests_pick_draw: "Draw",
  quests_pick_away: "Away",
  quests_action_commit_pick: "Commit pick",
  quests_committed: "Committed",
  quests_action_reveal: "Reveal & claim",
  quests_result_pending: "Result not settled yet — check back after the match.",
  quests_reveal_other_device: "Reveal from the device you committed on.",
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
  league_season_top3: "Season {id} · Top 3",
  league_err_name_required: "Name is required.",
  league_err_wallet_invalid: "Agent wallet must be a valid address.",
  league_err_id_owned: "Agent ID is already owned by another wallet.",
  league_already_registered: "Agent already registered",
  league_enter_season: "Enter Season",
  league_err_no_season: "No active Agent League season.",
  league_already_entered: "Agent already entered",
  league_entered_season: "Agent entered season",
  league_enter_failed: "Could not enter season",
  league_registered_heading: "Your agent is registered",
  league_agent_id_label: "Agent ID:",
  league_view_register_tx: "View register tx ↗",
  league_no_season_title:
    "The contract has no open season right now — an admin needs to call openSeason(). Your agent is registered and can be entered once a season opens.",
  league_no_season_btn: "No active season — try again later",
  league_enter_season_step2: "Step 2 · Enter Season {id}",
  league_register_another: "Register another",
  league_field_name: "Name",
  league_field_wallet: "Agent wallet",
  league_field_endpoint: "Endpoint hint",
  league_field_price: "Price per call (OKB)",
  league_ph_name: "alpha-striker-v1",
  league_ph_wallet: "0x…",
  league_ph_endpoint: "https://my-agent.example.com",

  // leaderboard
  leaderboard_title: "Leaderboard",
  leaderboard_subtitle:
    "Your on-chain Fan Reputation — XP, prediction accuracy, and breadth, read live from FanRep.",
  leaderboard_your_standing: "Your standing",
  leaderboard_connect: "Connect your wallet to see your on-chain standing.",
  leaderboard_no_fanid: "Mint your Fan ID to start building your reputation.",
  leaderboard_global_title: "Global ranking",
  leaderboard_filter_all: "All fans",
  leaderboard_team_empty: "No fans backing this team yet.",
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
  team_all_teams: "All teams",

  // quests stats
  quests_stat_live: "Live",
  quests_stat_upcoming: "Upcoming",
  quests_stat_total: "Total",

  // landing — tracks
  tracks_heading: "Three ways to play",
  tracks_social_label: "01 · SOCIAL",
  tracks_social_headline: "A fan reputation that's truly yours",
  tracks_social_desc:
    "Pick your nations, complete free quests, and build a reputation no one can buy or fake — your prediction accuracy, your breadth, your loyalty over time. It lives in your wallet, not on our server.",
  tracks_social_feature1: "One free Fan ID per wallet — yours forever",
  tracks_social_feature2: "Every quest you finish is a real transaction",
  tracks_social_feature3: "Your score is public and portable across X Layer",
  tracks_social_cta: "Start your quests",
  tracks_nft_label: "02 · NFT",
  tracks_nft_headline: "Trophies you earn, never buy",
  tracks_nft_desc:
    "Commemorative trophies you unlock by hitting real milestones — calling the group stage, going on a prediction streak, lifting the cup with your team. Never random, never paid, never a loot box. Claim for gas and keep them forever.",
  tracks_nft_feature1: "Unlocked by real milestones, not luck",
  tracks_nft_feature2: "Gas-only to claim — no fees, no packs",
  tracks_nft_feature3: "Yours to keep, one per fan",
  tracks_nft_cta: "See the trophy room",
  tracks_ai_label: "03 · AI AGENT",
  tracks_ai_headline: "Build a bot, enter the league",
  tracks_ai_desc:
    "Spin up your own AI agent and drop it into a free, skill-only prediction tournament against everyone else's — and our three companions. Top of the table lifts the AI Champion trophy. The league is open to anyone who can ship.",
  tracks_ai_feature1: "Anyone can deploy and enter — no gatekeeping",
  tracks_ai_feature2: "Free to enter; predict, reveal, and score each round",
  tracks_ai_feature3: "Win the season, claim the AI Champion trophy",
  tracks_ai_cta: "Enter your agent",

  // landing — how it works
  how_heading: "How Kickoff works",
  how_step_aria: "Step {numeral}",
  how_step1_title: "Connect OKX Wallet",
  how_step1_subtitle: "OKB pays gas. No deposits, no sign-ups, no custody.",
  how_step2_title: "Mint your Fan ID",
  how_step2_subtitle:
    "One soulbound SBT per wallet. Free, gas-only, non-transferable.",
  how_step3_title: "Complete quests",
  how_step3_subtitle:
    "Watch matches, predict scores, share posts. Every action earns XP on chain.",
  how_step4_title: "Earn trophies, run agents",
  how_step4_subtitle:
    "Claim ERC-1155 commemoratives. Deploy your own AI agent to the league.",

  // landing — on-chain proof
  proof_heading: "Verifiable on chain",
  proof_intro:
    "Every transaction below is on X Layer testnet. Click to see the receipt on OKLink.",
  proof_open_season: "Season 1 is active and accepting agent submissions.",
  proof_submit_prediction:
    "A hash-committed score prediction posted before kickoff.",
  proof_score_prediction:
    "Reveal after the OptimisticOracle settled. +1000 XP.",
  proof_match_analyst:
    "Real Claude Haiku 4.5 pre-match preview written on chain.",
  proof_personal_stats:
    "Caller's FanRep XP-stats and coaching reply, on chain.",
  proof_highlights: "Post-match summary grounded only in supplied facts.",

  // landing — CTA section
  cta_eyebrow: "Live on X Layer testnet",
  cta_headline: "Mint your Fan ID. Run an agent. Watch the league.",
  cta_subhead: "Three OKX X Cup tracks. One platform. No wagers.",
  cta_browse_quests: "Browse quests",
  cta_fork_agent: "Fork the BYO agent",
  cta_footnote:
    "Free quests · Free league entry · OKB only for agent service fees",

  // landing — architecture
  arch_heading: "Architecture at a glance",
  arch_intro:
    "Five new v2 contracts plus a reused bonded optimistic oracle, all on X Layer testnet 1952.",
  arch_diagram_aria: "Contract architecture diagram",
  arch_tile_wallet: "OKX Wallet",
  arch_tile_wallet_sub: "OKB gas",
  arch_tile_web: "web",
  arch_tile_web_sub: "Next.js",
  arch_tile_oracle: "OptimisticOracle",
  arch_tile_oracle_sub: "reused, bonded",
  arch_tile_keeper: "Keeper",
  arch_tile_keeper_sub: "openfootball / API-FOOTBALL",
  arch_fanrep_blurb:
    "Soulbound ERC-721 + multi-dim reputation (score(address)).",
  arch_questengine_blurb:
    "SELF_ATTEST / PREDICTION (commit-reveal) / EXTERNAL_PROOF.",
  arch_trophy_blurb:
    "ERC-1155 commemoratives. Deterministic gating. No randomness.",
  arch_agentregistry_blurb:
    "Permissionless agents. OKB per call. composeAgents fan-out.",
  arch_agentleague_blurb:
    "Bring-Your-Own-Agent seasons. Commit-reveal. AI Champion trophy.",
  arch_view_contracts: "View contracts on OKLink",

  // landing — FAQ
  faq_heading: "FAQ",
  faq_q1: "Is this real money or play money?",
  faq_a1:
    "Play money. There are no entry fees against an outcome, no payouts tied to predictions, and no betting markets. Quests are free. The Companion charges a tiny per-call fee in OKB for the service itself, with a free tier always available.",
  faq_q2: "Do I need crypto to try Kickoff?",
  faq_a2:
    "You need an EVM wallet (OKX Wallet works best) and a small amount of testnet OKB for gas. The faucet link in the header gets you the OKB for free; everything else is just clicking and signing.",
  faq_q3: "What does “halal-by-design” mean here?",
  faq_a3:
    "Three engineering rules: no entry fees against an outcome, no payouts tied to predictions, no randomised mints. The on-chain code itself contains no betting primitives — only Fan ID, quests, trophies, agents, and a verifier-style oracle that says “this match’s result was X”.",
  faq_q4: "What’s a Bring-Your-Own-Agent league?",
  faq_a4:
    "A free-skill tournament for AI agents on X Layer. Anyone can register an agent (their backend, their LLM, their logic), enter it into the active season, commit predictions before kickoff, and reveal afterwards. Top-ranked agent’s owner mints the AI Champion trophy. No money in, no money out — reputation only.",
  faq_q5: "What is X Layer and why use it?",
  faq_a5:
    "X Layer is OKX’s OP Stack L2. Gas is paid in OKB. Sub-cent transactions, OKX Wallet works natively, OKLink for verifiable proof. Kickoff turns the World Cup attention spike into real on-chain transactions on X Layer.",
  faq_q6: "Where do I see the on-chain proof?",
  faq_a6:
    "Every state-changing action — mint, quest complete, prediction commit/reveal, agent call, trophy claim — emits an event linked to the public OKLink explorer. The “Verifiable on chain” section above lists six representative transactions from this build.",

  // common
  common_loading: "Loading…",
  common_error: "Something went wrong.",
  common_demo_banner:
    "Demo mode — contracts aren't deployed yet. Numbers below are placeholders.",
  common_connect_first: "Connect your wallet to continue.",
  common_view: "View",
} as const;
