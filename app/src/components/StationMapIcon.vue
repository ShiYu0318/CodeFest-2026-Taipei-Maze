<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>

<script>
const paths = {
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
  locate:
    "M12 2v3m0 14v3M2 12h3m14 0h3M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  qrcode:
    "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM6 6h.01M18 6h.01M6 18h.01M12 3v3m0 3v3H9m3 3v6m3-9h3v3h3m-6 3v3h6v-3m0-6v-1",
  platform:
    "M6 15h12V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2Zm0-5h12M9 13h.01M15 13h.01M9 18l-2 3m8-3 2 3",
  elevator: "M5 10h14v11H5zm7 0v11M8 7V3L6 5m2-2 2 2m6-2v4l-2-2m2 2 2-2",
  restroom: "M7 5h.01M5 10h4m-2 0v10m-2 0 2-5 2 5M17 5h.01m0 5-3 6h6l-3-6v10",
  nursing:
    "M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-3 8v-2a4 4 0 0 1 7-2m-7 8h8l5-6m-5 2 2-2m2-2h.01",
  info: "M12 11v6m0-10h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.1 9a2.9 2.9 0 1 1 5.1 1.9c-1.2 1-2.2 1.3-2.2 3m0 3h.01",
  ticket: "M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V7Zm11 0v2m0 2v2m0 2v2",
  aed: "M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-3 3-1 6 1 8l7 7 7-7c2-2 4-5 1-8Zm-8 3-2 4h4l-2 4",
  phone: "m7 3 4 5-2 2a11 11 0 0 0 5 5l2-2 5 4-1 3C12 22 2 12 4 4l3-1Z",
  stairs: "M3 17h4v-4h4V9h4V5h6m-5 12 5-5m-5 0h5v5",
  "stairs-escalator": "M2 15h4v-4h4V7h4V3h5M3 21h5L20 9m-5 0h5v5",
  stairway:
    "M3 19h4v-4h4v-4h4M16 6a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2m0 3h.01",
  escalator:
    "M4 15h4l7-8h5a2 2 0 0 1 0 4h-3l-7 8H4a2 2 0 0 1 0-4Zm5-4V8m0-3h.01",
  water: "M12 3c2 4 6 7 6 11a6 6 0 0 1-12 0c0-4 4-7 6-11Z",
  locker: "M5 3h14v18H5zm3 4h8m-8 3h8m-2 5h2",
  accessible: "M10 4h.01M10 8l1 6h6l3 5m-9-8h4m-7 1a5 5 0 1 0 6 7",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  reset: "M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6m9-7v8m-4-4h8",
  arrow: "m9 6 6 6-6 6",
};

export default {
  props: { name: { type: String, required: true } },
  setup: () => ({ paths }),
};
</script>
