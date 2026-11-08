// Coordinates follow the corresponding pages of the Taipei Metro PDF at 1349 px wide.
// The two lower pages are offset to align their reference footprints with page 2.
// Centers are the area centroids of the solid outlines in shared map coordinates.
export const b2Outline =
  "M34 495H634L708 61l91 17 4-17 100 45-1-12 88 15-68 386h427v57l18 1-34 77h16v59H34v-62H18l34-79H34Z";
// Railway platforms: north-to-south order checked against TRA's B2 plan.
// Relative placement follows the railway footprint north/west of the metro
// concourse in Metro 051.pdf. These are schematic, not surveyed coordinates.
export const b2RailPlatforms = [
  {
    id: "tra-4",
    operator: "tra",
    number: 4,
    x: -785,
    y: -720,
    label: "台鐵 TRA・4 月台",
  },
  {
    id: "tra-3",
    operator: "tra",
    number: 3,
    x: -785,
    y: -500,
    label: "台鐵 TRA・3 月台",
  },
  {
    id: "hsr-2",
    operator: "hsr",
    number: 2,
    x: -785,
    y: -280,
    label: "高鐵 HSR・2 月台",
  },
  {
    id: "hsr-1",
    operator: "hsr",
    number: 1,
    x: -785,
    y: -60,
    label: "高鐵 HSR・1 月台",
  },
];
const railOutlines = b2RailPlatforms.map(
  ({ x, y }) => `M${x} ${y}l1900-140v160L${x} ${y + 160}Z`
);
export const floors = {
  "1F": {
    name: "車站大廳",
    bounds: [5, 0, 909, 793],
    center: [459.5, 396.5],
  },
  B1: {
    name: "站內通道與出口",
    bounds: [14, 375, 1190, 1000],
    center: [693.87, 884.2],
  },
  B2: {
    name: "板南線大廳與轉乘通道",
    bounds: [95, 490, 1133, 844],
    center: [661.5, 912],
  },
  B3: {
    name: "板南線月台・淡水信義線大廳",
    bounds: [248, 237, 1260, 1120],
    center: [950.32, 880.75],
  },
  B4: {
    name: "淡水信義線月台",
    bounds: [590, 397, 822, 732],
    center: [1006.41, 769.23],
  },
};

export const stackBounds = [-65, 235, 1385, 1190];

const b1LowerConcourse =
  "216 2v-29h34v15l-19 8v75l-213-2v45h-27v-33l-19-16H770l-39 25h-72v24h-24l-16-47H488v-99h-19v-23h58v50h142v-43h8v-25h26v25";
const b1NorthApproach =
  "M222 647l289-25-4-46 25-2 5 45 221-18-3-43 18-2 5 43 140-11 13-39-21 3-4-17 30-6 21-75 66 18-12 50 23-4 4 17-31 5-12 42 29-3 2 17-100 4-22 19 24 281-9 12-6 20";
const b1WestReturn = "6 43-25 3-6-43-291 27 6 44-23 3-48-418 26-4Z";
const b1NorthHoles =
  "M225 673l30 273 290-27-27-272Z M541 647l26 271 129-11-26-272Z M699 633l28 271 176-16-25-271Z";
const b1WestContext = "M47 605l134-4 20 163-154 50Z";
const b1EastContext =
  "M1024 579 1061 575 1085 902 936 915 912 1051 888 1047 910 946 917 923 928 911 904 636 927 602 1026 597Z";

export const plans = {
  // The reference plan shows south at the top. The schematic is north-up.
  "1F": {
    outlines: ["M68 97H851V696H68Z"],
    regions: [
      [
        "context",
        "M255 265H648V526H255Z M68 282H200V504H68Z M714 282H851V504H714Z",
      ],
      ["blue", "M349 311H608V481H349Z"],
      ["red", "M255 265H324V526H255Z M714 454H851V504H714Z"],
    ],
    labels: [
      [460, 26, "市民大道"],
      [218, 76, "北 3 門"],
      [456, 76, "北 2 門"],
      [695, 76, "北 1 門"],
      [32, 254, "W1"],
      [32, 565, "W3"],
      [888, 254, "E1"],
      [888, 565, "E3"],
      [478, 408, "車站大廳"],
      [219, 735, "南 3 門"],
      [460, 735, "南 2 門"],
      [701, 735, "南 1 門"],
      [460, 779, "忠孝西路"],
    ],
  },
  B2: {
    offset: [512.5, 960],
    scale: 0.5,
    outlines: [b2Outline, ...railOutlines],
  },
  B1: {
    // The overview outlines retain the original QR anchor edges and indices.
    outlines: [
      b1WestContext,
      `${b1NorthApproach}-345 31 ${b1WestReturn} ${b1NorthHoles}`,
      "M1024 579l37-4 24 327-149 13-25 143-28-6 45-141-24-275 23-34 99-5Z",
      `M818 929l87-8 11 18-28 108 60 10-13 80-25-5 7-38-15-3-14 89 ${b1LowerConcourse}h94l14-47-13-148h-35v-25h54Z M824 965l-12 65 53 13 13-59-28-26Z M814 1059l-25 122h34l25-114Z`,
    ],
    // The north concourse and the K Mall / M3 passage are one continuous
    // area. The detailed drawing and the walking network share this outline.
    detailOutlines: [
      b1WestContext,
      b1EastContext,
      `${b1NorthApproach}L910 946 888 1047 948 1057 935 1137 910 1132 917 1094 898 1090 892 1113 874 1110 861 1180H888l${b1LowerConcourse}H796L787 1180H811V1153L836 1156 853 1068 809 1060 797 1124H758L755 1100H763V1078H752L746 1018H763V944H811L814 1005H818L820 994 814 943 856 939 868 935 869 930 815 934 813 925 704 951 568 963l${b1WestReturn} ${b1NorthHoles} M821 972 824 960 850 958 875 980 865 1041 813 1031 824 994Z M827 950 864 946 876 934 872 945 869 951 869 963 864 965 849 952 827 954Z`,
    ],
    regions: [["context", `${b1WestContext} ${b1NorthHoles} ${b1EastContext}`]],
    labels: [
      [122, 695, "桃園機場捷運"],
      [367, 787, "西區停車場"],
      [994, 735, "東區停車場"],
      [718, 772, "臺鐵／高鐵"],
      [962, 428, "往 Y・R 區"],
      [880, 537, "M1"],
      [1082, 535, "M2"],
      [1001, 1120, "M3"],
      [630, 1090, "M4"],
      [482, 1090, "M5"],
      [650, 1339, "M6"],
      [1147, 1154, "M7"],
      [896, 1339, "M8"],
      [635, 1035, "往 K 區"],
      [421, 1204, "往 Z 區"],
    ],
  },
  B3: {
    offset: [5, 28],
    outlines: [
      "M1044 291l37 10 2-7 29 14 2-6 31 9-20 96 7 2-19 95 16 2-53 248-22 7-53 268-42-9-9 6-44-16-2 8-42-17 13-70-10-170-16 3-20-276 203-17Z",
      "M550 1181h650v32h9l-13 34h5v33H550v-33h-10l17-34h-7Z",
    ],
    regions: [
      [
        "red",
        "M1069 308l36 7-8 37 24 8-13 45-8-2-83 415h12l-32 146-12-3-5 18-11-2-5 29-69-16 47-232-24-4-15-246 79-7 2-22 51-11Z",
      ],
      ["blue", "M574 1197h603v68H574Z"],
    ],
    labels: [
      [1033, 245, "往市民大道"],
      [950, 567, "淡水信義線大廳"],
      [764, 583, "臺鐵轉乘區"],
      [766, 731, "高鐵轉乘區"],
      [693, 1164, "← 4 月台・頂埔"],
      [1032, 1306, "3 月台・南港展覽館 →"],
    ],
  },
  B4: {
    offset: [8, 38],
    outlines: [
      "M1008 405l34 8 1-10 28 22 2-9 37 7-121 634-36-8-1 9-27-19-1 8-37-9Z",
    ],
    regions: [["red", "M1023 429l63 11-110 567-11-2-4 21-28-5 4-27-15-3Z"]],
    labels: [
      [891, 523, "2 月台"],
      [861, 554, "往廣慈／奉天宮"],
      [1164, 523, "1 月台"],
      [1180, 554, "往淡水／北投"],
    ],
  },
};
