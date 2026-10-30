// Một ShaderStage duy nhất cho toàn site. Section import { stage } từ đây để setWeight / set / force / glitch.
import { ShaderStage } from "./ShaderStage";
import { registerScenes } from "./scenes";

export const stage = new ShaderStage(document.getElementById("stage") as HTMLCanvasElement);
registerScenes(stage);
document.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => stage.bind(el, el.dataset.scene!));
