# README

## Insert Numbers Ex for Visual Studio Code

[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23ea4aaa)](https://github.com/sponsors/almiraj/)

An extension to insert increasing numbers.

![Demo](./images/demo.gif)

## Usage

* Command: `Insert Numbers Ex`
* Keybindings: `ctrl+alt+n` on Windows and Linux or `cmd+alt+n` on macOS

## Settings

No settings required. No more `settings.json`.

## Caution

VS Code's Command Palette may ignore leading spaces in the input.

If you need space padding, include another visible character in the pattern, such as `[ 1]`.

## Thanks

Thanks to Asuka for the original [Insert Numbers](https://marketplace.visualstudio.com/items?itemName=Asuka.insertnumbers) extension, which I have long loved.

This project is a small tribute to that work.

## Examples

INPUT (num) : `0`, `1`, `01`, `[ 8]`
```text
0    1    01    [ 8]
1    2    02    [ 9]
2    3    03    [10]
3    4    04    [11]
...
```

INPUT (`~`) : `1~3`, `5~2`, `01~3`, `[ 8]~10`
```text
1    5    01    [ 8]
2    4    02    [ 9]
3    3    03    [10]
1    2    01    [ 8]
2    5    02    [ 9]
3    4    03    [10]
1    3    01    [ 8]
2    2    02    [ 9]
3    5    03    [10]
...
```

INPUT (`*`) : `1*3`, `02*3`, `[ 8]*3`
```text
1    02    [ 8]
1    02    [ 8]
1    02    [ 8]
2    03    [ 9]
2    03    [ 9]
2    03    [ 9]
3    04    [10]
3    04    [10]
3    04    [10]
4    05    [11]
4    05    [11]
4    05    [11]
...
```

INPUT (paren) : `1.`, `1_`, `(1)`
```text
1.    1_    (1)
2.    2_    (2)
3.    3_    (3)
4.    4_    (4)
...
```

INPUT (radix) : `0b01`, `0o06`, `0x0e`, `0X08`
```text
0b01     0o06    0x0e    0X08
0b10     0o07    0x0f    0X09
0b11     0o10    0x10    0X0A
0b100    0o11    0x11    0X0B
...
```

INPUT (locale) : `１`, `一`, `①`, `٠`, `०`, `Ⅰ`
```text
１    一    ①    ٠    ०    Ⅰ
２    二    ②    ١    १    Ⅱ
３    三    ③    ٢    २    Ⅲ
４    四    ④    ٣    ३    Ⅳ
...
```

INPUT (alpha) : `a`, `A`, `α`, `а`, `å`
```text
a    A    α    а    å
b    B    β    б    ä
c    C    γ    в    ö
d    D    δ    г    a
...
```

INPUT (char) : `あ`, `ア`, `ｱ`, `가`
```text
あ    ア    ｱ    가
い    イ    ｲ    나
う    ウ    ｳ    다
え    エ    ｴ    라
...
```

INPUT (ym) : `202611`, `2026/11`, `2026/8`
```text
202611    2026/11    2026/8
202612    2026/12    2026/9
202701    2027/01    2026/10
202702    2027/02    2026/11
...
```

INPUT (ymd) : `20261230`, `2026/12/30`, `2026/4/29`
```text
20261230    2026/12/30    2026/4/29
20261231    2026/12/31    2026/4/30
20270101    2027/01/01    2026/5/1
20270102    2027/01/02    2026/5/2
...
```

INPUT (md) : `04/29`, `4/29`, `12/30`
```text
04/29    4/29    12/30
04/30    4/30    12/31
05/01    5/1     01/01
05/02    5/2     01/02
...
```

INPUT (mdy) : `04/29/2026`, `4/29/2026`, `12/30/2026`
```text
04/29/2026    4/29/2026    12/30/2026
04/30/2026    4/30/2026    12/31/2026
05/01/2026    5/1/2026     01/01/2027
05/02/2026    5/2/2026     01/02/2027
...
```

INPUT (my) : `11/2026`, `8/2026`
```text
11/2026    8/2026
12/2026    9/2026
01/2027    10/2026
02/2027    11/2026
...
```

INPUT (alpha-m) : `Nov`, `NOV`, `November`, `Sep`, `Sept`
```text
Nov    NOV    November    Sep    Sept
Dec    DEC    December    Oct    Oct
Jan    JAN    January     Nov    Nov
Feb    FEB    February    Dec    Dec
...
```

INPUT (alpha-my) : `Nov/2026`, `Nov 2026`
```text
Nov/2026    Nov 2026
Dec/2026    Dec 2026
Jan/2027    Jan 2027
Feb/2027    Feb 2027
...
```

INPUT (alpha-md) : `Dec 30`
```text
Dec 30
Dec 31
Jan 1
Jan 2
...
```

INPUT (alpha-mdy) : `Dec 30 2026`, `Dec 30, 2026`
```text
Dec 30 2026    Dec 30, 2026
Dec 31 2026    Dec 31, 2026
Jan 1 2027     Jan 1, 2027
Jan 2 2027     Jan 2, 2027
...
```

INPUT (time) : `23:58`, `23:59:58`
```text
23:58    23:59:58
23:59    23:59:59
00:00    00:00:00
00:01    00:00:01
...
```

INPUT (datetime) : `2026/12/31 23:59:58`, `2026-12-31 23:59:58`
```text
2026/12/31 23:59:58    2026-12-31 23:59:58
2026/12/31 23:59:59    2026-12-31 23:59:59
2027/01/01 00:00:00    2027-01-01 00:00:00
2027/01/01 00:00:01    2027-01-01 00:00:01
...
```
