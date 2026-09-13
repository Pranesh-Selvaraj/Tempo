import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDbHandle } from './index';
import { rules } from './schema';

interface SeedRule {
  category: string;
  title: string;
  content: string;
  orderIndex: number;
  diagramUrl?: string;
}

const SEED_RULES: SeedRule[] = [
  // ── Scoring ────────────────────────────────────────────────────────────────
  {
    category: 'Scoring',
    title: 'Rally scoring',
    content:
      'Every rally awards a point, no matter which team served. The team that wins the rally serves next.',
    orderIndex: 1,
  },
  {
    category: 'Scoring',
    title: 'Winning a set',
    diagramUrl: '/rules/diagrams/scoring.svg',
    content:
      'A set is won by the first team to reach 25 points with at least a two-point lead. There is no ceiling: play continues until one team leads by two.',
    orderIndex: 2,
  },
  {
    category: 'Scoring',
    title: 'Winning the match',
    content: 'A match is best of five sets. The first team to win three sets wins the match.',
    orderIndex: 3,
  },
  {
    category: 'Scoring',
    title: 'The deciding set',
    diagramUrl: '/rules/diagrams/scoring.svg',
    content:
      'The fifth set is played to 15 points with a two-point lead required. Teams switch sides when the leading team reaches 8 points.',
    orderIndex: 4,
  },
  {
    category: 'Scoring',
    title: 'Timeouts',
    content:
      'Each team may request two 30-second timeouts per set. In FIVB play, automatic technical timeouts occur when the leading team reaches 8 and 16 points.',
    orderIndex: 5,
  },
  {
    category: 'Scoring',
    title: 'Substitutions',
    content:
      'Each team is allowed six substitutions per set. A starting player may be replaced and later re-enter, but only for the player who replaced them.',
    orderIndex: 6,
  },

  // ── Positions & Rotations ─────────────────────────────────────────────────
  {
    category: 'Positions & Rotations',
    title: 'The six positions',
    diagramUrl: '/rules/diagrams/positions.svg',
    content:
      'Positions are numbered 4-3-2 across the front row (left, middle, right) and 5-6-1 across the back row. Position 1 is right back, where the server starts.',
    orderIndex: 1,
  },
  {
    category: 'Positions & Rotations',
    title: 'Clockwise rotation',
    diagramUrl: '/rules/diagrams/rotation.svg',
    content:
      'When a team wins a rally against the serve, its players rotate one position clockwise before serving: 2 → 1, 1 → 6, 6 → 5, 5 → 4, 4 → 3, 3 → 2.',
    orderIndex: 2,
  },
  {
    category: 'Positions & Rotations',
    title: 'Front row and back row',
    diagramUrl: '/rules/diagrams/positions.svg',
    content:
      'Players in positions 4, 3 and 2 are front row. Players in 5, 6 and 1 are back row. Back-row players may not attack from in front of the attack line.',
    orderIndex: 3,
  },
  {
    category: 'Positions & Rotations',
    title: 'Front-to-back overlap',
    diagramUrl: '/rules/diagrams/overlap.svg',
    content:
      'At the moment the serve is contacted, each front-row player must be closer to the net than the corresponding back-row player (4 in front of 5, 3 in front of 6, 2 in front of 1).',
    orderIndex: 4,
  },
  {
    category: 'Positions & Rotations',
    title: 'Side-to-side overlap',
    diagramUrl: '/rules/diagrams/overlap.svg',
    content:
      'Within a row, players must keep their left-to-right order: 4 left of 3, 3 left of 2, and 5 left of 6, 6 left of 1 at the instant of the serve.',
    orderIndex: 5,
  },
  {
    category: 'Positions & Rotations',
    title: 'When a position fault is called',
    content:
      'A positional fault is only judged at the moment the ball is contacted for the serve. If it is called, the rally is lost and the opponent gets a point and the serve.',
    orderIndex: 6,
  },
  {
    category: 'Positions & Rotations',
    title: 'Free movement after the serve',
    content:
      'Once the serve is contacted, players may move anywhere on their side. Overlap is never judged again during the rally.',
    orderIndex: 7,
  },
  {
    category: 'Positions & Rotations',
    title: 'Setter in rotation 1',
    content:
      'A 5-1 setter in rotation 1 starts at right back (position 1). The setter serves, then transitions to the net from the back row.',
    orderIndex: 8,
  },

  // ── Contact Rules ─────────────────────────────────────────────────────────
  {
    category: 'Contact Rules',
    title: 'Three contacts maximum',
    diagramUrl: '/rules/diagrams/contact.svg',
    content:
      'A team may contact the ball up to three times before sending it back over. A block does not count as one of the three contacts.',
    orderIndex: 1,
  },
  {
    category: 'Contact Rules',
    title: 'Legal contact',
    content:
      'The ball may contact any part of the body: head, foot, leg — as long as the contact is simultaneous and the ball is not caught or thrown.',
    orderIndex: 2,
  },
  {
    category: 'Contact Rules',
    title: 'Double contact',
    content:
      'A player contacting the ball twice in succession is a fault (four hits is also the result). Exceptions: a block, or multiple contacts during a single first team contact.',
    orderIndex: 3,
  },
  {
    category: 'Contact Rules',
    title: 'Simultaneous contacts by teammates',
    content:
      'When two teammates touch the ball at the same moment, it counts as two of the three team contacts. Either player may play the next contact.',
    orderIndex: 4,
  },
  {
    category: 'Contact Rules',
    title: 'Lift / thrown ball',
    content:
      'The ball must be contacted cleanly. Carrying, catching, throwing or pushing the ball is an illegal contact (a "lift").',
    orderIndex: 5,
  },
  {
    category: 'Contact Rules',
    title: 'Hard-driven first ball',
    content:
      'On a hard-driven attack, the first contact may be played with multiple contacts of the body (for example, a dig that rebounds off the arms and body).',
    orderIndex: 6,
  },
  {
    category: 'Contact Rules',
    title: 'Reaching over the net to attack',
    content:
      'An attacker may reach beyond the net only when the ball is on their own side, or after the opponent has used all three contacts, or on a back-row attack behind the attack line.',
    orderIndex: 7,
  },
  {
    category: 'Contact Rules',
    title: 'Back-row attack',
    content:
      'A back-row player must take off from behind the attack line. Landing in the front zone is allowed if the takeoff was behind the line.',
    orderIndex: 8,
  },

  // ── Faults ────────────────────────────────────────────────────────────────
  {
    category: 'Faults',
    title: 'Four hits',
    content: 'Using four team contacts before returning the ball is a fault.',
    orderIndex: 1,
  },
  {
    category: 'Faults',
    title: 'Ball out of bounds',
    content:
      'A ball is out when it lands completely outside the boundary lines, touches an object outside the court, or crosses the net outside the antennas.',
    orderIndex: 2,
  },
  {
    category: 'Faults',
    title: 'Center line violation',
    diagramUrl: '/rules/diagrams/faults.svg',
    content:
      'A player may touch the center line, but any part of the foot must remain in contact with it. Crossing the line completely is a fault.',
    orderIndex: 3,
  },
  {
    category: 'Faults',
    title: 'Net touch',
    diagramUrl: '/rules/diagrams/faults.svg',
    content:
      'Touching the net between the antennas, the antenna, or the top band is a fault. Incidental contact with the net by hair or loose parts of the uniform is not.',
    orderIndex: 4,
  },
  {
    category: 'Faults',
    title: 'Blocking or attacking across the center line',
    content:
      'A blocker may penetrate the plane above the net but must not touch the ball on the opponent side before the opponent has hit it.',
    orderIndex: 5,
  },
  {
    category: 'Faults',
    title: 'Illegal screening',
    content:
      'A teammate may not wave arms, jump, or form a screen that hides the server from the receiving team at the moment of the serve.',
    orderIndex: 6,
  },
  {
    category: 'Faults',
    title: 'Double fault and replay',
    content:
      'When two opposing players commit a fault at the same time, it is a double fault and the rally is replayed.',
    orderIndex: 7,
  },

  // ── Net Rules ─────────────────────────────────────────────────────────────
  {
    category: 'Net Rules',
    title: 'Net height',
    diagramUrl: '/rules/diagrams/net.svg',
    content:
      "Men's net height is 2.43 m, women's is 2.24 m (indoor). Beach net heights are 2.43 m men and 2.24 m women as well, measured at the center.",
    orderIndex: 1,
  },
  {
    category: 'Net Rules',
    title: 'Crossing between the antennas',
    diagramUrl: '/rules/diagrams/net.svg',
    content:
      'The ball must cross the net plane entirely between the two antennas. Touching an antenna is a fault.',
    orderIndex: 2,
  },
  {
    category: 'Net Rules',
    title: 'Ball off the net',
    content:
      'A ball that touches the net may remain in play and be contacted again within the three-contact limit — including a serve that clips the net and lands in.',
    orderIndex: 3,
  },
  {
    category: 'Net Rules',
    title: 'Antennas and top band',
    diagramUrl: '/rules/diagrams/net.svg',
    content:
      'Antennas extend 0.8 m above the net and mark the legal crossing corridor. The top band and antennas are part of the net.',
    orderIndex: 4,
  },
  {
    category: 'Net Rules',
    title: 'Post contact',
    content:
      'A ball that touches the net posts or cables is out, unless it was driven into the net and the posts are not in the path of the ball.',
    orderIndex: 5,
  },

  // ── Serve Rules ───────────────────────────────────────────────────────────
  {
    category: 'Serve Rules',
    title: 'Serve order',
    content:
      'Teams serve in rotational order. When a team wins the serve back, it rotates clockwise before the next serve.',
    orderIndex: 1,
  },
  {
    category: 'Serve Rules',
    title: 'Eight seconds to serve',
    content:
      "The server must contact the ball within 8 seconds of the referee's whistle.",
    orderIndex: 2,
  },
  {
    category: 'Serve Rules',
    title: 'Toss for serve',
    content:
      'The server must toss or release the ball before striking it, and may not catch or re-toss it. One toss only.',
    orderIndex: 3,
  },
  {
    category: 'Serve Rules',
    title: 'Where to serve from',
    diagramUrl: '/rules/diagrams/serve.svg',
    content:
      'The server stands behind the end line, anywhere within the extension of the sidelines, and may not touch the court or the line until after contact.',
    orderIndex: 4,
  },
  {
    category: 'Serve Rules',
    title: 'Serving faults',
    diagramUrl: '/rules/diagrams/serve.svg',
    content:
      'It is a fault if the server touches the court/line, fails to contact within 8 seconds, screens the ball, or the serve does not cross between the antennas.',
    orderIndex: 5,
  },
  {
    category: 'Serve Rules',
    title: 'Serve reception',
    content:
      'The receiving team must not block or attack the serve. Jumping to block a serve is a fault.',
    orderIndex: 6,
  },

  // ── Libero Rules ──────────────────────────────────────────────────────────
  {
    category: 'Libero Rules',
    title: 'Libero restrictions',
    diagramUrl: '/rules/diagrams/libero.svg',
    content:
      'The libero may not serve, block or attempt to block, and may not complete an attack-hit from anywhere if the ball is entirely above the net.',
    orderIndex: 1,
  },
  {
    category: 'Libero Rules',
    title: 'Libero replacements',
    content:
      'Libero replacements are unlimited and are not counted as substitutions. Each replacement must occur while the ball is dead.',
    orderIndex: 2,
  },
  {
    category: 'Libero Rules',
    title: 'Front-row libero',
    diagramUrl: '/rules/diagrams/libero.svg',
    content:
      'If the libero rotates to the front row, they must be replaced by the player they replaced before the next serve.',
    orderIndex: 3,
  },
  {
    category: 'Libero Rules',
    title: 'Libero uniform',
    content:
      'The libero must wear a uniform of a clearly contrasting colour to the rest of the team.',
    orderIndex: 4,
  },
  {
    category: 'Libero Rules',
    title: 'Two liberos',
    content:
      'A team may designate up to two liberos per match, but only one libero may be on the court at a time.',
    orderIndex: 5,
  },
];

async function main(): Promise<void> {
  const handle = createDbHandle();
  const existing = await handle.db.select().from(rules);
  const byTitle = new Map(existing.map((rule) => [`${rule.category}::${rule.title}`, rule]));

  let inserted = 0;
  let updated = 0;
  for (const rule of SEED_RULES) {
    const found = byTitle.get(`${rule.category}::${rule.title}`);
    if (found) {
      await handle.db
        .update(rules)
        .set({ content: rule.content, orderIndex: rule.orderIndex, diagramUrl: rule.diagramUrl ?? null })
        .where(eq(rules.id, found.id));
      updated += 1;
    } else {
      await handle.db.insert(rules).values({ ...rule, diagramUrl: rule.diagramUrl ?? null });
      inserted += 1;
    }
  }

  console.log(`[db] rules seeded: ${inserted} inserted, ${updated} updated (${SEED_RULES.length} total)`);
  await handle.close();
}

main().catch((error: unknown) => {
  console.error('[db] seed failed', error);
  process.exit(1);
});
