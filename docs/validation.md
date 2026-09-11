# Weryfikacja — 2026-09-11

- 15 testów fizyki i serwera: zaliczone na macOS / Node 26 oraz Linux / Node 24 w kontenerze.
- 4 scenariusze w Chrome: zaliczone również z serwerem w kontenerze.
  Obejmują sterowanie, walkę z botami, zwolnienie klawiszy po utracie fokusu,
  tabelę wyników, dwóch klientów w jednym pokoju, wznowienie po zamknięciu
  WebSocket, opóźnienie 75 ms w każdą stronę i układ dotykowy 390 × 844.
- W próbie z opóźnieniem: zmierzone RTT 153 ms, końcowe 60 FPS,
  maksymalnie 15 niepotwierdzonych komend. Test sprawdza lokalną reakcję
  przed odpowiedzią serwera i zgodność pozycji po puszczeniu klawisza.
- Próba obciążenia: 32 klientów w 4 pokojach, 15 sekund, 60 Hz,
  0 pominiętych kroków, maksymalny czas kroku 13 ms.
  Klienci i serwer działały w jednym procesie na tym komputerze.
- `npm audit --omit=dev`: brak zgłoszonych podatności.
- Obraz `node:24-alpine` zbudowany i uruchomiony; endpoint `/health` odpowiada.

To są pomiary lokalne, nie gwarancja FPS na dowolnym sprzęcie ani test internetu.
Nie sprawdzono Safari, Firefox, rzeczywistych telefonów ani utraty pakietów.
Kontener działa lokalnie; publiczny serwer nie został wdrożony.

Polecenia do powtórzenia prób znajdują się w głównym README.
