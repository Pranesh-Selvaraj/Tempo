import { usePlayStore } from '../../stores/playStore';
import { Player } from './Player';

export function Players() {
  const players = usePlayStore((state) => state.players);
  return (
    <>
      {players.map((player) => (
        <Player key={player.playerId} state={player} />
      ))}
    </>
  );
}
