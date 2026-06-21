import numpy as np
import pandas as pd
from pathlib import Path

try:
    from config import name_map
    from predict import predicting
except ImportError:
    from .config import name_map
    from .predict import predicting

BASE_DIR = Path(__file__).parent.parent

_fixtures = pd.read_csv(BASE_DIR / 'data/raw/wc2026_fixtures.csv')
_elo      = pd.read_csv(BASE_DIR / 'data/processed/elo_current.csv')

_group_fixtures = _fixtures[
    _fixtures['Group'].notna() & (_fixtures['Group'] != '')
].copy()

_r32_fixtures = _fixtures[_fixtures['Round Number'] == 'Round of 32'].sort_values('Match Number')

# Hardcoded bracket: (result_match, source_match_1, source_match_2)
_R16_BRACKET  = [(89,73,74),(90,75,76),(91,77,78),(92,79,80),
                 (93,81,82),(94,83,84),(95,85,86),(96,87,88)]
_QF_BRACKET   = [(97,89,90),(98,91,92),(99,93,94),(100,95,96)]
_SF_BRACKET   = [(101,97,98),(102,99,100)]
_FINAL_BRACKET = [(103,101,102)]

_pred_cache: dict = {}


def _normalize(team: str) -> str:
    return name_map.get(team, team)


def _get_prediction(home: str, away: str) -> dict:
    key = (home, away)
    if key not in _pred_cache:
        _pred_cache[key] = predicting(_normalize(home), _normalize(away), neutral=True)
    return _pred_cache[key]


def _sample_match(pred: dict) -> tuple[str, int, int]:
    p = np.array([pred['HOME_WIN'], pred['DRAW'], pred['AWAY_WIN']], dtype=float)
    p /= p.sum()
    outcome = np.random.choice(['H', 'D', 'A'], p=p)
    home_goals = int(np.random.poisson(pred['home_xg']))
    away_goals = int(np.random.poisson(pred['away_xg']))
    if outcome == 'H' and home_goals <= away_goals:
        home_goals = away_goals + 1
    elif outcome == 'A' and away_goals <= home_goals:
        away_goals = home_goals + 1
    elif outcome == 'D' and home_goals != away_goals:
        away_goals = home_goals
    return outcome, home_goals, away_goals


def _sample_ko(home: str, away: str) -> str:
    """No draws: sample winner using HOME_WIN / (HOME_WIN + AWAY_WIN)."""
    pred = predicting(_normalize(home), _normalize(away), neutral=True, knockout=True)
    p_home = pred['HOME_WIN'] / (pred['HOME_WIN'] + pred['AWAY_WIN'])
    return home if np.random.random() < p_home else away


def _rank_group(standings: dict) -> list[str]:
    teams = list(standings.keys())
    teams.sort(key=lambda t: (
        -standings[t]['pts'],
        -standings[t]['gd'],
        -standings[t]['gf'],
    ))
    return teams


def _simulate_once(group_fixtures: pd.DataFrame) -> tuple[dict, dict]:
    """Returns (group_rankings, group_standings)."""
    groups: dict[str, dict] = {}

    for _, row in group_fixtures.iterrows():
        g = row['Group']
        home, away = row['Home Team'], row['Away Team']
        if g not in groups:
            groups[g] = {}
        for team in (home, away):
            if team not in groups[g]:
                groups[g][team] = {'pts': 0, 'gf': 0, 'gd': 0}

    for _, row in group_fixtures.iterrows():
        g = row['Group']
        home, away = row['Home Team'], row['Away Team']
        pred = _get_prediction(home, away)
        _, hg, ag = _sample_match(pred)

        groups[g][home]['gf'] += hg
        groups[g][away]['gf'] += ag
        groups[g][home]['gd'] += hg - ag
        groups[g][away]['gd'] += ag - hg

        if hg > ag:
            groups[g][home]['pts'] += 3
        elif hg == ag:
            groups[g][home]['pts'] += 1
            groups[g][away]['pts'] += 1
        else:
            groups[g][away]['pts'] += 3

    rankings = {g: _rank_group(s) for g, s in groups.items()}
    return rankings, groups


def _assign_third_place(rankings: dict, standings: dict) -> dict:
    """
    Rank the 12 third-place finishers, take best 8, assign them to R32 slots.
    Uses backtracking with most-constrained-first to avoid deadlocks (e.g.
    Group G only fits 2 slots, Group K only fits 1).
    Returns { slot_code: team_name }.
    """
    thirds = []
    for g, ranking in rankings.items():
        team   = ranking[2]
        letter = g.split(' ')[1]
        stats  = standings[g][team]
        thirds.append({'team': team, 'letter': letter, 'stats': stats})

    thirds.sort(key=lambda x: (-x['stats']['pts'], -x['stats']['gd'], -x['stats']['gf']))
    qualifiers = thirds[:8]

    third_slots = []
    for _, row in _r32_fixtures.iterrows():
        for slot in (row['Home Team'], row['Away Team']):
            if isinstance(slot, str) and slot.startswith('3'):
                third_slots.append(slot)

    assignments: dict[str, str] = {}

    def backtrack(remaining_q: list, remaining_slots: list) -> bool:
        if not remaining_q:
            return True
        # Most constrained qualifier first (fewest eligible slots)
        remaining_q = sorted(
            remaining_q,
            key=lambda q: sum(1 for s in remaining_slots if q['letter'] in s[1:]),
        )
        q = remaining_q[0]
        for slot in remaining_slots:
            if q['letter'] in slot[1:]:
                assignments[slot] = q['team']
                if backtrack(remaining_q[1:], [s for s in remaining_slots if s != slot]):
                    return True
                del assignments[slot]
        return False

    backtrack(qualifiers, third_slots)
    return assignments


def _resolve_slot(slot: str, rankings: dict, third_assignments: dict) -> str:
    position = int(slot[0])
    if slot[1].isalpha() and len(slot) == 2:
        group = 'Group ' + slot[1]
        return rankings[group][position - 1]
    elif slot.startswith('3'):
        return third_assignments[slot]
    raise ValueError(f'Cannot resolve slot: {slot}')


def simulate_tournament(n: int = 10000) -> dict:
    """
    Returns { team: { r32, r16, qf, sf, final, winner } } as fractions (0–1).
    """
    # Pre-warm group-stage prediction cache
    for _, row in _group_fixtures.iterrows():
        _get_prediction(row['Home Team'], row['Away Team'])

    # Counters: team → stage → count
    counts: dict[str, dict[str, int]] = {}

    for _ in range(n):
        rankings, standings = _simulate_once(_group_fixtures)
        third_assignments   = _assign_third_place(rankings, standings)

        # Resolve R32 starting slots → actual teams
        match_winner: dict[int, str] = {}
        for _, row in _r32_fixtures.iterrows():
            mn   = int(row['Match Number'])
            home = _resolve_slot(row['Home Team'], rankings, third_assignments)
            away = _resolve_slot(row['Away Team'], rankings, third_assignments)
            match_winner[mn] = _sample_ko(home, away)

            # Track R32 qualifier
            for team in (home, away):
                if team not in counts:
                    counts[team] = {s: 0 for s in ('r32','r16','qf','sf','final','winner')}
                counts[team]['r32'] += 1

        for bracket, stage in [(_R16_BRACKET,'r16'),(_QF_BRACKET,'qf'),
                                (_SF_BRACKET,'sf'),(_FINAL_BRACKET,'final')]:
            for result_mn, src1, src2 in bracket:
                home = match_winner[src1]
                away = match_winner[src2]
                winner = _sample_ko(home, away)
                match_winner[result_mn] = winner

                for team in (home, away):
                    if team not in counts:
                        counts[team] = {s: 0 for s in ('r32','r16','qf','sf','final','winner')}
                    counts[team][stage] += 1

                if stage == 'final':
                    if winner not in counts:
                        counts[winner] = {s: 0 for s in ('r32','r16','qf','sf','final','winner')}
                    counts[winner]['winner'] += 1

    return {
        team: {stage: round(c / n, 4) for stage, c in stages.items()}
        for team, stages in counts.items()
    }


_cache = None


def get_cached_simulation():
    global _cache
    if _cache is None:
        _cache = simulate_tournament(n=3000)
    return _cache
