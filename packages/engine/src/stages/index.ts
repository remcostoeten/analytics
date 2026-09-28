import type { Stage } from "../define";
import { errorStage } from "../errors/stage";
import { botScoreStage } from "./bot-score";
import { enrichStage } from "./enrich";
import { flagsStage } from "./flags";

export const defaultStages: Stage[] = [enrichStage, botScoreStage, flagsStage, errorStage];
