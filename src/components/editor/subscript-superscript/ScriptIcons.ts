import { defineComponent, h } from "vue";

export const SuperscriptIcon = defineComponent({
  name: "SuperscriptIcon",
  render() {
    return h("span", { class: "script-icon" }, [
      h("span", { class: "script-icon__base" }, "X"),
      h("sup", { class: "script-icon__mark" }, "2"),
    ]);
  },
});

export const SubscriptIcon = defineComponent({
  name: "SubscriptIcon",
  render() {
    return h("span", { class: "script-icon" }, [
      h("span", { class: "script-icon__base" }, "X"),
      h("sub", { class: "script-icon__mark" }, "2"),
    ]);
  },
});
