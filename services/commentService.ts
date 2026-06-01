const openers = [
  "Styret har vurdert saken i tre sekunder",
  "Dette er dessverre textbook botmateriale",
  "Lagkassen bukker og takker",
  "Her lukter det svakt av minus i karakterboka",
  "Regnskapet har talt",
  "VAR-rommet fant ingen formildende omstendigheter",
  "Dette blir en pen liten post i botbudsjettet",
  "Finansavdelingen i garderoben nikker anerkjennende",
  "Her var det bare å finne frem Vipps-fingeren",
  "Kassereren fikk plutselig bedre puls",
  "NHHI FCs interne rentekomite er ikke imponert",
  "Dommeren hadde latt det gå, men botsjefen er strengere",
  "Dette er akkurat slik man bygger klubbkultur og likviditet",
  "En liten gavepakke til fellesskapet",
  "Her var marginene tynnere enn en borteforklaring etter kamp",
  "Det der var ikke helt Champions League-standard",
  "Lagkassen registrerer en offensiv bidragsyter",
  "Dette havner rett i årsrapporten",
  "Botsjefens penn skriver nesten av seg selv",
  "Markedet priser inn svak disiplin",
];

const closers = [
  "Betal med verdighet.",
  "Ingen appell, bare betaling.",
  "Ta det som læring, og litt som skatt.",
  "Klubben setter pris på bidraget.",
  "Neste gang: mindre kaos, mer kontroll.",
  "Dette er dyr læring, men fortsatt læring.",
  "Vipps, så er samvittigheten ren.",
  "Garderoben forventer rask oppgjør.",
  "Boten er liten, signaleffekten enorm.",
  "Sånn går det når disiplinen handles på billigsalg.",
  "Kostnaden er midlertidig, ryktet varer litt lenger.",
  "Betaling innen fornuften rekker å komme tilbake.",
  "Her må kontoen ta en for laget.",
  "Dette er solidaritet i praksis.",
  "Regnes som frivillig tvang.",
  "Ingen grunn til panikk, bare et lite økonomisk gult kort.",
  "Fint bidrag til klubbens bærekraftige driftsmodell.",
  "Kvittering kan fremvises for moralsk rehabilitering.",
  "Du kan trekke det fra stoltheten.",
  "La oss kalle det en investering i garderobekulturen.",
];

const categoryComments: Array<{ match: RegExp; lines: string[] }> = [
  {
    match: /forsein|sent|late/i,
    lines: [
      "Klokka vant duellen klart.",
      "Oppmøtepresisjonen var på nivå med en utsatt togavgang.",
      "Du kom inn som en innbytter uten å ha varmet opp.",
      "Tidsskjemaet ble driblet vekk på egen halvdel.",
      "Kalenderen ber om bedre lagkamerater.",
      "Dette var ikke forsinkelse, det var et prosjekt.",
      "Du møtte opp med negativ xP, expected punctuality.",
      "Startfløyta gikk, du var fortsatt i pre-match finance mode.",
    ],
  },
  {
    match: /fantasy/i,
    lines: [
      "Fantasy-laget ditt trenger tydeligvis en emisjon.",
      "Dette var managerarbeid med negativ avkastning.",
      "Kapteinsvalget ditt burde vært sendt på høring.",
      "Porteføljen din skriker etter risikostyring.",
      "Her har du solgt Haaland og kjøpt skam.",
      "Fantasy er ikke bare spill, det er offentlig dokumentasjon på dømmekraft.",
    ],
  },
  {
    match: /svar|reply|påmeld/i,
    lines: [
      "Kommunikasjonsavdelingen tok fri uten å melde fra.",
      "Svarfristen gikk forbi deg på kanten.",
      "Telefonen din var tydeligvis i lavblokk.",
      "Dette var en stille protest mot grunnleggende logistikk.",
      "Meldingsdisiplinen var like svak som markeringen på bakerste stolpe.",
      "Lagledelsen ber om mindre mystikk og mer respons.",
    ],
  },
  {
    match: /møter ikke|no show|ikke.*møt/i,
    lines: [
      "Oppmøtet ditt var mer usynlig enn presspillet etter 80 minutter.",
      "Du leverte en solid prestasjon i fravær.",
      "Lagkameratene fant deg ikke, og det gjorde ikke GPS-en heller.",
      "Dette var Casper-rollen, bare uten Oscar-nominasjon.",
      "Påmeldt og borte er en dyr kombinasjon.",
      "Du ble savnet taktisk, økonomisk blir du husket.",
    ],
  },
  {
    match: /luke|nutmeg/i,
    lines: [
      "Tunnelavgiften er aktivert.",
      "Beina sto åpne som et dårlig Excel-ark.",
      "Det der var kollektiv underholdning med individuell kostnad.",
      "Du ble brukt som rundkjøring, og bompenger gjelder.",
      "Teknisk avdeling noterte seg åpningen.",
      "Når ballen går mellom beina, går pengene ut av kontoen.",
    ],
  },
  {
    match: /shot|kompromiss/i,
    lines: [
      "Forhandlingsresultatet ble dyrt, som vanlig.",
      "Kompromisset traff hardere enn avslutningen.",
      "Dette er flytende regnskapsføring.",
      "Du tapte både forhandling og likviditet.",
      "Avtalen er inngått, boten er bokført.",
      "Her ble det både promille og prosentpoeng.",
    ],
  },
  {
    match: /ball|nett|over/i,
    lines: [
      "Ballen forlot banen, og pengene følger etter.",
      "Den avslutningen hadde mer satellittbane enn presisjon.",
      "NASA ringte, de vil ha ballen tilbake.",
      "Skuddet gikk høyt, boten lander lavt og presist.",
      "Dette var ikke klarering, det var eksport.",
      "Ballbudsjettet sender sine kondolanser.",
    ],
  },
  {
    match: /idiot/i,
    lines: [
      "Kategorien forklarer egentlig seg selv.",
      "Her trengs ingen revisjonsrapport.",
      "Noen saker er så klare at selv benken forstår dem.",
      "Dette var et kunstverk i dårlig dømmekraft.",
      "Du har levert sterkt i rollen som case study.",
      "Fin liten påminnelse om at fri vilje har kostnader.",
    ],
  },
  {
    match: /gf|generalforsamling/i,
    lines: [
      "Demokratiet ventet, du gjorde ikke.",
      "Dette er brudd på både møteplikt og god selskapsstyring.",
      "Generalforsamlingen registrerte svak corporate governance.",
      "Protokollen noterte fravær, kassereren noterte inntekt.",
      "Aksjonærene i lagkassen er fornøyde.",
      "Du møtte kapitalmarkedet med svak timing.",
    ],
  },
];

const amountComments = [
  { min: 100, lines: ["Beløpet tilsier at dette var mer hendelse enn uhell.", "Dette er ikke bot, det er en liten emisjon.", "Kontoen din får kjenne på toppfotballens brutalitet."] },
  { min: 50, lines: ["Solid mellomstor smell i privatøkonomien.", "Dette er akkurat dyrt nok til å irritere.", "En respektabel bot for en respektabel tabbe."] },
  { min: 1, lines: ["Småpenger, stor symbolverdi.", "Lav sum, høy læring.", "Dette svir mest i stoltheten."] },
];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const getCategoryLine = (category: string): string => {
  const match = categoryComments.find(({ match }) => match.test(category));
  return match ? pick(match.lines) : pick([
    "Dette var en hendelse med klar botverdi.",
    "Garderoben trenger ikke mer bevis enn dette.",
    "Du har levert et bidrag til fellesskapet, om enn ufrivillig.",
    "Dette er en klassisk NHHI FC-transaksjon.",
    "Sportslig tvilsomt, økonomisk nyttig.",
    "Her er det bare å bokføre og gå videre.",
    "Dagens tabbe blir morgendagens driftsinntekt.",
    "Klubbens kontantstrøm styrkes av svake valg.",
  ]);
};

const getAmountLine = (amount: number): string => {
  const bucket = amountComments.find(({ min }) => amount >= min) ?? amountComments[amountComments.length - 1];
  return pick(bucket.lines);
};

export const generateFineComment = (
  playerName: string,
  fineCategory: string,
  fineDescription: string,
  fineAmount: number
): string => {
  const name = playerName.split(' ')[0] || playerName;
  const detail = fineDescription ? ` (${fineDescription})` : '';
  const formats = [
    () => `${pick(openers)}: ${name}, ${getCategoryLine(fineCategory)} ${pick(closers)}`,
    () => `${name} får ${fineAmount} kr for "${fineCategory}"${detail}. ${getAmountLine(fineAmount)} ${pick(closers)}`,
    () => `${getCategoryLine(fineCategory)} ${name}, ${pick(closers).toLowerCase()}`,
    () => `${pick(openers)}. ${getAmountLine(fineAmount)} ${pick(closers)}`,
  ];

  return pick(formats)();
};
