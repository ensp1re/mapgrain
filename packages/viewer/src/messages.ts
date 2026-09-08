export const LOCALE = {
  EN: "en",
  UK: "uk",
} as const;

export type Locale = (typeof LOCALE)[keyof typeof LOCALE];

export const MESSAGES = {
  en: {
    readonly: "Read-only view",
    search: "Search",
    searchHits: "Search results",
    fit: "Fit",
    theme: "Theme",
    fullscreen: "Fullscreen",
    upstream: "Upstream",
    downstream: "Downstream",
    from: "From",
    to: "To",
    route: "Route",
    view: "View",
    json: "Download JSON",
    reset: "Reset highlight",
    help: "Help",
    story: "Story",
    previous: "Previous",
    next: "Next",
    lens: "Lens",
    resetLens: "Reset lens",
    helpText:
      "Drag to pan. Wheel or +/- to zoom. Click or Enter a node to focus. Upstream/Downstream follow directed edges and stop at cycles. Route shows one path or No route. Stories use Previous/Next or [ ]. Lenses filter by authored role. / focuses search. Escape clears highlight. Named views and focus restore from the local hash. This is a static graph, not a live system.",
  },
  uk: {
    readonly: "Лише перегляд",
    search: "Пошук",
    searchHits: "Результати пошуку",
    fit: "Вмістити",
    theme: "Тема",
    fullscreen: "На весь екран",
    upstream: "Вгору",
    downstream: "Вниз",
    from: "З",
    to: "До",
    route: "Маршрут",
    view: "Вигляд",
    json: "Завантажити JSON",
    reset: "Скинути підсвітлення",
    help: "Довідка",
    story: "Історія",
    previous: "Назад",
    next: "Далі",
    lens: "Лінза",
    resetLens: "Скинути лінзу",
    helpText:
      "Перетягуйте, щоб панорамувати. Колесо або +/- для масштабу. Клік або Enter фокусує вузол. Вгору/вниз ідуть за напрямком ребер і зупиняються на циклах. Маршрут показує один шлях або «Немає маршруту». Історії: Назад/Далі або [ ]. Лінзи фільтрують за авторською роллю. / фокусує пошук. Escape скидає підсвітлення. Іменовані вигляди відновлюються з локального хеша. Це статичний граф, не жива система.",
  },
} as const;

export function localeFrom(value: string | undefined): Locale {
  return value === LOCALE.UK ? LOCALE.UK : LOCALE.EN;
}

export function messagesFor(locale: Locale): (typeof MESSAGES)[Locale] {
  return MESSAGES[locale];
}
