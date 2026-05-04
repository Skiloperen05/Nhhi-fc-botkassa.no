
import { GoogleGenAI } from "@google/genai";

// Use direct environment variable as per guidelines
export const generateRoast = async (playerName: string, fineCategory: string, fineDescription: string, fineAmount: number): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const detailedReason = fineDescription ? `${fineCategory} (${fineDescription})` : fineCategory;

    const prompt = `
      Du er botsjefen for fotballaget NHHI FC (Norges Handelshøyskole Idrettsforening). 
      Appen din ligger på nhhi-fc-botkassa.no.
      Din jobb er å komme med en kort, skarp, og morsom kommentar til en spiller som har fått en bot.
      Tonen skal være "garderobeprat", litt frekk men med glimt i øyet. Bruk gjerne fotballterminologi eller økonomi-referanser (siden det er handelshøyskolen).
      
      Spiller: ${playerName}
      Hva har skjedd: ${detailedReason}
      Beløp: ${fineAmount} kr.
      
      Gi meg KUN kommentaren, maks 2 setninger.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Ingen kommentar, bare betal.";
  } catch (error) {
    console.error("Gemini error:", error);
    return "Dommeren har talt. Betal.";
  }
};

export const generateSeasonSummary = async (finesData: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const prompt = `
        Her er en liste over bøter gitt til fotballaget NHHI FC så langt i sesongen.
        Dataene er hentet fra nhhi-fc-botkassa.no.
        Lag en kort, humoristisk oppsummering (maks 100 ord) av tilstanden i lagkassen og moralen i laget basert på disse dataene.
        Nevn gjerne hvem som er verstingen hvis det er tydelig.
  
        Data:
        ${finesData}
      `;
  
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
  
      return response.text || "";
    } catch (error) {
      console.error("Gemini error:", error);
      return "";
    }
  };
