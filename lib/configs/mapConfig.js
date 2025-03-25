const map = new Map([
  [
    "eastsoft/0000IPX8/0000MLID",
    {
      type: "switch",
      channels: { switch_ch1: 1, switch_ch2: 2, switch_ch3: 3 },
    },
  ],
  [
    "eastsoft/0000IPX8/0000EMVU",
    {
      type: "switch",
      channels: { switch_ch1: 4, switch_ch2: 5, switch_ch3: 6 },
    },
  ],
  [
    "eastsoft/0000IPX8/0000LE9W",
    {
      type: "switch",
      channels: { switch_ch1: 7, switch_ch2: 8, switch_ch3: 9 },
    },
  ],
  [
    "eastsoft/0000IPX8/00004Q1N",
    {
      type: "switch",
      channels: { switch_ch1: 10, switch_ch2: 11, switch_ch3: 12 },
    },
  ],
  [
    "eastsoft/0000IPX8/0000BIWH",
    {
      type: "switch",
      channels: { switch_ch1: 13, switch_ch2: 14, switch_ch3: 15 },
    },
  ],
  [
    "eastsoft/0000IPX8/000026CG",
    {
      type: "switch",
      channels: { switch_ch1: 16, switch_ch2: 17, switch_ch3: 18 },
    },
  ],
  [
    "eastsoft/0000IPX8/00003AAD",
    {
      type: "switch",
      channels: { switch_ch1: 19, switch_ch2: 20, switch_ch3: 21 },
    },
  ],
  [
    "eastsoft/0000IPX8/000042JG",
    { type: "HPD", channels: { people: 22, tempature: 23 } },
  ],
  [
    "eastsoft/0000IPX8/0000D0TF",
    {
      type: "HPD",
      channels: {
        illumination: 24,
        people: 25,
      },
    },
  ],
  [
    "eastsoft/0000IPX8/00009FAK",
    {
      type: "HPD",
      channels: {
        illumination: 26,
        people: 27,
      },
    },
  ],
]);
module.exports = map;
