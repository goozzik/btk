# Bunny the Killer

Króliki, tostery i grzanki. Przeglądarkowa strzelanka platformowa dla 2–8 osób,
z osobnymi pokojami i treningiem z trzema botami.

## Uruchomienie

Wymagany Node.js 22 lub nowszy (zalecany [24 LTS](https://github.com/nodejs/Release#release-schedule)).

```sh
npm ci
npm start
```

Otwórz **http://localhost:3000**. Nie otwieraj `index.html` jako pliku — fizyka
i multiplayer potrzebują uruchomionego serwera. Nie ma kompilatora CoffeeScript,
bundlera ani zewnętrznych CDN. `npm run dev` restartuje serwer po zmianach.

## Gra ze znajomymi

1. Wybierz „Graj ze znajomymi”, aby utworzyć pokój.
2. Skopiuj zaproszenie albo podaj znajomym kod pokoju.
3. Wszyscy muszą wejść na **ten sam serwer**. W domowej sieci użyj adresu komputera
   uruchamiającego grę, np. `http://192.168.1.20:3000`, również na swoim komputerze
   przed skopiowaniem zaproszenia. `localhost` działa tylko na własnym urządzeniu.

„Wskakuj na arenę” łączy z otwartym pokojem; „Trening z botami” tworzy osobną arenę.
W zaproszeniu przycisk gry dołącza bezpośrednio do wskazanego pokoju.
Runda trwa 3 minuty lub do 10 fragów. Po 8 sekundach rusza kolejna.
Trzy grzanki eliminują królika; odrodzenie trwa 2 sekundy. Osłona po odrodzeniu
trwa 1,5 sekundy i znika po oddaniu strzału.

| Sterowanie                          | Akcja                                  |
| ----------------------------------- | -------------------------------------- |
| A / D lub strzałki                  | Ruch                                   |
| Spacja / W / ↑                      | Skok, ponownie w powietrzu: drugi skok |
| S / ↓                               | Zeskok przez półkę                     |
| Mysz + lewy przycisk, ewentualnie P | Celowanie i strzelanie                 |
| Tab (przytrzymaj)                   | Wyniki                                 |
| Esc                                 | Menu (mecz trwa dalej)                 |

Na ekranach dotykowych pojawiają się przyciski; przycisk strzału celuje w najbliższego
żywego przeciwnika. Dźwięk włącza przycisk u góry. Nie ma automatycznie odtwarzanej muzyki.

## Co zmieniono

- Node.js + `ws` zastępują Express 3, Socket.IO 0.9 i melonJS 0.9.
- Serwer jest właścicielem fizyki, pocisków, obrażeń, wyników i odrodzeń.
  Klient wysyła wyłącznie przyciski i kąt celowania.
- Fizyka działa w stałym kroku 60 Hz. Stan jest wysyłany 20 razy na sekundę.
  Własny ruch jest przewidywany lokalnie i uzgadniany z potwierdzeniami serwera;
  inni gracze są interpolowani z buforem 100 ms.
- Renderowanie przez `requestAnimationFrame`, tło zapisane w buforze,
  limit 220 cząsteczek, limit rozdzielczości do 2× DPR i ograniczone kolejki sieciowe.
- Osiem nowych póz królika, niezależnie celowany oryginalny toster, animacje biegu,
  skoku i lądowania, odrzut, okruszki, dźwięki i kamera podążająca za graczem.
- Walidacja wiadomości, limity wielkości i częstotliwości, heartbeat,
  oddzielne pokoje oraz wznowienie sesji do 20 sekund po rozłączeniu.

Oryginalne pliki CoffeeScript, mapa i grafika zostały zachowane w `src/`, `textures/`
i `public/data/`; nie są już kodem wykonawczym gry. Stary serwer i poprzedni ekran
są dostępne w historii Gita. Usunięto z wersjonowania 973 pliki starych zależności
z `node_modules`; odtwarzalną instalację zapewnia teraz `package-lock.json`.

## Weryfikacja

```sh
npm test                 # fizyka, walka, prawdziwe połączenia WebSocket
npm run test:browser     # Chrome: sterowanie, dwa okna, reconnect, telefon
npm run test:load        # 32 klientów w 4 pokojach przez 15 s
```

Testy przeglądarkowe lokalnie używają zainstalowanego Chrome. W CI używają Chromium
instalowanego przez Playwright. Zrzuty z testów trafiają do ignorowanego `artifacts/`.
Przykładowa konfiguracja GitHub Actions jest w `docs/ci-example.yml`; aby ją włączyć,
umieść ją w `.github/workflows/test.yml` kontem z uprawnieniami do workflow.
`LOAD_SECONDS` i `LOAD_ROOMS` zmieniają długość i skalę próby obciążenia.
`/health` zwraca stan serwera i podstawowe pomiary symulacji.

## Serwer w internecie

To jest działający serwer Node/WebSocket, więc sam hosting statyczny (np. GitHub Pages)
nie wystarczy. Uruchom jedną instancję za reverse proxy obsługującym HTTPS i WebSocket.
`PORT` domyślnie wynosi `3000`, `HOST` — `0.0.0.0`.

```sh
docker build -t bunny-the-killer .
docker run --init --restart unless-stopped -p 3000:3000 bunny-the-killer
```

Przykład Caddy (podmień domenę i skieruj DNS na swój serwer):

```caddy
bunny.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Proxy musi przekazać oryginalny nagłówek `Host`. Stan pokoi żyje w pamięci:
restart kończy mecze, wyniki nie są zapisywane, a wielu instancji nie należy
stawiać za losowym load balancerem. Limit to 8 graczy w pokoju, 64 pokoje i
256 połączeń na proces; są to limity ochronne, nie deklaracja zmierzonej pojemności.

Lokalne próby nie zastępują testów na rzeczywistych łączach internetowych.
WebSocket używa TCP, więc utrata pakietów może chwilowo zatrzymać dostarczanie stanu;
predykcja i interpolacja ograniczają odczuwalne skoki, lecz nie usuwają opóźnień sieci.
Pociski i trafienia nie stosują cofania świata do czasu strzału gracza.

Szczegóły grafiki i dokładny brief: [docs/art.md](docs/art.md).
Licencja oryginału: [MIT-LICENSE](MIT-LICENSE).

Dokumentacja wykorzystana przy przebudowie: [ws](https://github.com/websockets/ws),
[predykcja i uzgadnianie stanu](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html),
[interpolacja](https://gafferongames.com/post/snapshot_interpolation/),
[oficjalny obraz Node.js](https://github.com/nodejs/docker-node).
