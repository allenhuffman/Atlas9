# Telephone Simulator

A browser-based simulation of a landline phone, built to recreate the phone system at Atlas9 (Kansas). It can also be used for similar systems, such as Meow Wolf locations.

Select a phone, pick up the receiver, hear the dial tone, and dial a number on the keypad (on screen or keyboard). If the number is in `numbers.csv`, its recording plays. Otherwise you get the "cannot be completed" message.

It is plain HTML, CSS and JavaScript with no build step and no dependencies.

## Running

Browsers block `fetch()` on `file://`, so serve the folder over HTTP:

```
python3 -m http.server
```

Then open <http://localhost:8000>. No restart is needed after edits. Reload the page (Safari: Shift-click the reload button to bypass the cache).

## Using it

| Control | Action |
| --- | --- |
| `Enter` | Toggle pickup / hangup |
| Phone dropdown | Choose which phone is calling (names only; numbers are not shown) |
| Pick up button | Lift the receiver, play the dial tone |
| Keypad / number keys | Dial (only works while off hook) |
| Hang up button | Hang up, stop all audio |

`*` and `#` play their tones but do nothing else, as on a real phone. Letters are not accepted: dial digits only.
Dialing another phone's known number makes it ring until you hang up. Dialing the selected phone's own number still plays a busy signal.

## Adding numbers

1. Drop a shared recording in `audio/` named after the number as written in the CSV: `553-456.mp3`. A file directly in `audio/` is available from every phone.
2. Add a line to `numbers.csv`:

```
# number,description
553-456,(55-FILM) Reel Line
8000,Voicemail
```

- Format is `number,description`. The description is only a label, so rename it freely without touching the audio file.
- Dashes are for readability. Dialing ignores them (`553-456` is dialed as `553456`).
- Numbers can be any length. Lines starting with `#` and blank lines are ignored.
- Phone-keypad letters (such as `FILM`) go in the description, not the number. Convert them to digits (`FILM` = 3456).
- `numbers.csv` lists recorded destinations; a recording file by itself does not add a dialable number. Known phone numbers in `phones.csv` are dialable too.

## Phones and phone-specific recordings

Edit `phones.csv` to add or rename phones. Use `number,name`; leave the number blank if it is unknown. Phone numbers are the stable recording-folder IDs, so changing a display name does not change the folder. Phone numbers may include dashes for readability.

Phones with known numbers in `phones.csv` are dialable destinations and ring until the caller hangs up. Dialing the selected phone's own number plays a busy signal. For different recordings depending on the calling phone, put an override in a folder named after that phone's number with dashes removed. The simulator checks the calling phone's folder first, then falls back to the common recordings in `audio/`. If neither exists, the call cannot be completed.

For a number like `8000` (voicemail) that differs per phone, keep it out of `audio/` and give each phone its own file: `audio/314112/8000.mp3` (Manager's Office) and `audio/999001/8000.mp3` (Film Storage). A phone with no `8000.mp3` of its own gets the "cannot be completed" message.

## System sounds

Optional recordings go in `audio/system/`. If one is missing, a synthesized tone is used.

| File | Played when |
| --- | --- |
| `dialtone.mp3` | The receiver is picked up (looped) |
| `reorder.mp3` | Off hook and nothing dialed for too long (looped) |
| `invalid.mp3` | The number is unknown or has no recording |
| `busy.mp3` | The selected phone calls its own number |
| `noanswer.mp3` | A known phone number is dialed; plays once, then the call ends unanswered |
| `ring-reorder.mp3` | Fallback when `noanswer.mp3` is missing or cannot play (looped until hang-up) |

If both recordings are missing or cannot play, a synthesized ringback tone loops until hang-up.

## Dialing rules

Settings are constants at the top of `app.js`:

| Constant | Default | Meaning |
| --- | --- | --- |
| `MAX_DIGITS` | 6 | Longest dialable number from `numbers.csv` or `phones.csv`. An unknown number is rejected once this many digits are dialed. Set it to the longest number on the system. |
| `IDLE_TIMEOUT_MS` | 5000 | Pause after which an incomplete or unknown number is rejected |
| `DIAL_TIMEOUT_MS` | 2000 | Wait after a complete number that is also the start of a longer one |
| `DIAL_TONE_TIMEOUT_MS` | 15000 | Off hook with no digits before the dial tone switches to reorder |
| `CHEAT_MODE` | false | When `true`, the Phone dropdown shows each phone's number and the status shows the description of the number being called |

A complete number that no longer number starts with plays after about 0.4 seconds.

## Theming

Colors, radius and font are CSS variables at the top of `style.css`.

## Versioning and caching

The page shows `page vN / script vN` in the bottom-right corner. When you change code, keep all four version references in sync: `VERSION` in `app.js`, the page label, and the `?v=` parameters on the script and stylesheet tags in `index.html`. If the two numbers on screen differ, the browser is using a cached file.

## Files

```
index.html        page
style.css         look and feel (theme variables)
app.js            dialing logic and sounds
numbers.csv       number list
phones.csv        phone numbers and display names
audio/            shared number recordings, available from every phone
audio/<phone>/    optional phone-specific number recordings
audio/system/     dial tone, reorder, invalid, busy, ringback
```
