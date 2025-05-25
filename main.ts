import { GoogleGenAI } from "@google/genai";
import puppeteer from "puppeteer";

type InformationsAboutPlayer = {
  seasons: string;
  team: string;
  goals: string;
  matches: string;
};

let usedNames: string[] = [];
const ai = new GoogleGenAI({
  apiKey: "AIzaSyAjGfoIRH9SMAgln7nE9mWNcMoza49w6-A",
});
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto("https://playfootball.games/career-path-challenge/");
await page.click(".absolute.right-4.top-4");

async function getInformantionsAboutPlayer() {
  const informationsAboutPlayer = await page.evaluate(() => {
    const tbody = document.querySelector("table tbody") as HTMLTableCellElement;
    const trs = tbody?.querySelectorAll(
      "tr"
    ) as NodeListOf<HTMLTableRowElement>;
    let informations: InformationsAboutPlayer[] = [];
    const numberOfTeams = trs.length;

    trs.forEach((tr) => {
      const text = tr.textContent as string;

      // caso não tenha nenhuma informação, a TD vem sempre com vários "???"
      const tdIsValid = !text.includes("?");

      if (tdIsValid) {
        const tds = tr.querySelectorAll(
          "td"
        ) as NodeListOf<HTMLTableCellElement>;

        const seasons = tds[0].textContent as string;
        const team = tds[1].textContent as string;
        const matches = tds[2].textContent as string;
        const goals = tds[3].textContent as string;

        const infos = {
          seasons,
          team,
          matches,
          goals,
        };

        informations.push(infos);
      }
    });

    return { informations, numberOfTeams };
  });

  const promptForAI = await preparingPromptForAI(
    informationsAboutPlayer.informations,
    informationsAboutPlayer.numberOfTeams
  );
  const player = await AIKicking(promptForAI);

  await checkIfIsTheCorrectlyPlayer(player);
}

async function preparingPromptForAI(
  informationsAboutPlayer: InformationsAboutPlayer[],
  numberOfTeams: number
) {
  let promptForAI: string = `O jogador jogou em ${numberOfTeams} times durante sua carreira.\n`;

  informationsAboutPlayer.forEach((informations) => {
    promptForAI += `Durante as temporadas ${informations.seasons} jogou no ${informations.team}, 
    fez ${informations.matches} partidas e marcou ${informations.goals} gols.`;
  });

  return promptForAI;
}

async function AIKicking(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `
      RESPONDA COM APENAS O NOME DE UM JOGADOR DE FUTEBOL!\n
      PS: NÃO REPITA ESSES NOMES, ELES ESTÃO INCORRETOS: ${usedNames.join(", ")}
      ${prompt}
    `,
  });

  const player = response.candidates[0].content?.parts[0].text as string;

  usedNames.push(player);

  return player;
}

async function checkIfIsTheCorrectlyPlayer(player: string) {
  const input = await page.waitForSelector(".grow input[type='text']");

  if (!input) {
    console.log("won the game!!");

    return;
  }

  await page.type(".grow input[type='text']", "");

  setTimeout(async () => {
    await page.type(".grow input[type='text']", player);
  }, 3000);

  const listPlayerHasNames = await page.evaluate(async () => {
    const divListPlayers = document.querySelector(
      ".grow div[role='combobox'] div[role='listbox']"
    ) as HTMLDivElement;

    const listPlayerIsGreaterThanZero = divListPlayers.hasChildNodes();

    if (listPlayerIsGreaterThanZero) {
      const firstElementInList = divListPlayers.firstChild as HTMLElement;

      const classesFirstElementInList = `.${firstElementInList.classList}`;

      await page.click(classesFirstElementInList);
    }

    return listPlayerIsGreaterThanZero;
  });

  if (!listPlayerHasNames) {
    await page.click(".grow button");
  }

  setTimeout(async () => {
    await getInformantionsAboutPlayer();
  }, 3000);
}

getInformantionsAboutPlayer();
