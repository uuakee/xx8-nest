import { IsInt, IsPositive } from 'class-validator';

export class GameLaunchDto {
  @IsInt()
  @IsPositive()
  game_id!: number;
}

