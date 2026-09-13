import type { ReactNode } from 'react';
import {
  MATCH_TYPE_INFO,
  clockElapsedMs,
  computeAnalytics,
  computePlayerStats,
  formatClock,
  maxSets,
  setsWon,
  substitutionLog,
  type MatchState,
} from './match';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function MatchReport({ match }: { match: MatchState }) {
  const analytics = computeAnalytics(match);
  const playerStats = computePlayerStats(match);
  const subs = substitutionLog(match);
  const homeWon = setsWon(match, 'home');
  const awayWon = setsWon(match, 'away');
  const winnerName = match.winner
    ? match.winner === 'home'
      ? match.config.homeName
      : match.config.awayName
    : 'In progress';

  return (
    <div id="match-report" className="hidden bg-white p-10 text-slate-900 print:block">
      <header className="flex items-end justify-between border-b-2 border-slate-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Tempo · Match report
          </p>
          <h1 className="mt-1 text-2xl font-black">
            {match.config.homeName} vs {match.config.awayName}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {MATCH_TYPE_INFO[match.config.type].label} ·{' '}
            {new Date().toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · Match clock {formatClock(clockElapsedMs(match))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-500">Result</p>
          <p className="text-xl font-black">
            {homeWon} – {awayWon}
          </p>
          <p className="text-xs text-slate-600">{winnerName}</p>
        </div>
      </header>

      <Section title="Sets">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="py-1">Team</th>
              {[...match.sets, null].map((_, index) => (
                <th key={index} className="py-1 text-center">
                  Set {index + 1}
                </th>
              ))}
              <th className="py-1 text-center">Sets won</th>
            </tr>
          </thead>
          <tbody>
            {(['home', 'away'] as const).map((side) => (
              <tr key={side} className="border-t border-slate-200">
                <td className="py-1 font-semibold">
                  {side === 'home' ? match.config.homeName : match.config.awayName}
                </td>
                {match.sets.map((set, index) => (
                  <td key={index} className="py-1 text-center tabular-nums">
                    {side === 'home' ? set.home : set.away}
                  </td>
                ))}
                <td className="py-1 text-center tabular-nums">
                  {side === 'home' ? match.homeScore : match.awayScore}
                </td>
                <td className="py-1 text-center font-bold tabular-nums">
                  {side === 'home' ? homeWon : awayWon}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-slate-500">
          Set {match.sets.length + 1} of {Math.min(maxSets(match.config), 99)} target{' '}
          {MATCH_TYPE_INFO[match.config.type].deciderTarget ?? MATCH_TYPE_INFO[match.config.type].setTarget}
        </p>
      </Section>

      <Section title="Team analytics">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {(['home', 'away'] as const).map((side) => (
            <div key={side} className="rounded border border-slate-200 p-3">
              <p className="font-bold">{side === 'home' ? match.config.homeName : match.config.awayName}</p>
              <dl className="mt-1 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sideout %</dt>
                  <dd className="tabular-nums">
                    {analytics.sideout[side] === null ? '—' : `${analytics.sideout[side]}%`}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Longest run</dt>
                  <dd className="tabular-nums">{analytics.longestRun[side]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Formation</dt>
                  <dd>{match.formations[side]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Court side</dt>
                  <dd>{(side === 'home') !== match.sidesSwapped ? 'Left' : 'Right'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Timeouts</dt>
                  <dd className="tabular-nums">
                    {match.timeouts[side]} × {match.config.timeoutSeconds}s
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Substitutions</dt>
                  <dd className="tabular-nums">{match.subs[side]}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Total rallies: <span className="font-semibold">{analytics.totalRallies}</span>
        </p>
      </Section>

      <Section title={`${match.config.homeName} points by rotation`}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left uppercase text-slate-500">
              <th className="py-1">Rotation</th>
              {analytics.pointsByRotation.map((item) => (
                <th key={item.rotation} className="py-1 text-center">
                  {item.rotation}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <td className="py-1 font-semibold">Points</td>
              {analytics.pointsByRotation.map((item) => (
                <td key={item.rotation} className="py-1 text-center tabular-nums">
                  {item.points}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Lineups & staff">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {(['home', 'away'] as const).map((side) => {
            const roster = match.rosters[side];
            const lineup = match.lineups[side];
            const rotation = side === 'home' ? match.homeRotation : match.awayRotation;
            return (
              <div key={side} className="rounded border border-slate-200 p-3">
                <p className="font-bold">
                  {side === 'home' ? match.config.homeName : match.config.awayName}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {lineup.map((id, index) => {
                    const player = roster.players.find((item) => item.id === id);
                    const position = ((index + rotation - 1) % 6) + 1;
                    return (
                      <li key={index} className="flex justify-between">
                        <span className="text-slate-500">P{position}</span>
                        <span>
                          {player ? `${player.number ? `#${player.number} ` : ''}${player.name || 'Unnamed'}` : '—'}
                        </span>
                        <span className="w-10 text-right uppercase text-slate-500">
                          {player?.role ?? ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {roster.staff.length > 0 && (
                  <p className="mt-2 text-slate-600">
                    Staff: {roster.staff.map((member) => `${member.name || 'Unnamed'} (${member.role})`).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {subs.length > 0 && (
        <Section title="Substitutions">
          <ul className="space-y-0.5 text-xs">
            {subs.map((entry, index) => (
              <li key={index}>
                Set {entry.setId} ·{' '}
                {entry.side === 'home' ? match.config.homeName : match.config.awayName} ·{' '}
                {entry.outName} → {entry.inName}{' '}
                <span className="text-slate-500">
                  ({entry.homeScore}–{entry.awayScore})
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {playerStats.length > 0 && (
        <Section title="Player stats">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left uppercase text-slate-500">
                <th className="py-1">Player</th>
                <th className="py-1">Type</th>
                <th className="py-1 text-right">Serve pts</th>
                <th className="py-1 text-right">Rallies</th>
                <th className="py-1 text-right">Part %</th>
                <th className="py-1 text-right">Subs in/out</th>
                <th className="py-1 text-right">Best run</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((stat) => (
                <tr key={stat.playerId} className="border-t border-slate-200">
                  <td className="py-1">
                    {stat.side === 'home' ? match.config.homeName : match.config.awayName} ·{' '}
                    {stat.number ? `#${stat.number} ` : ''}
                    {stat.name}
                  </td>
                  <td className="py-1 uppercase">{stat.role}</td>
                  <td className="py-1 text-right tabular-nums">{stat.servicePoints}</td>
                  <td className="py-1 text-right tabular-nums">{stat.ralliesOnCourt}</td>
                  <td className="py-1 text-right tabular-nums">{stat.participation}%</td>
                  <td className="py-1 text-right tabular-nums">
                    {stat.subsIn}/{stat.subsOut}
                  </td>
                  <td className="py-1 text-right tabular-nums">{stat.maxServingRun}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <footer className="mt-8 border-t border-slate-300 pt-2 text-center text-[10px] text-slate-500">
        Generated by Tempo — 3D volleyball play designer · built by Pranesh Selvaraj
      </footer>
    </div>
  );
}
