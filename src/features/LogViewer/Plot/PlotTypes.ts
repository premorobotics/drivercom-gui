export type PlotContext = {
  visible: boolean[];
  color: string[];
  style: LegendStroke[];
  selected: boolean[];
};

export enum LegendStroke {
  Line,
  Dash,
  Dot,
}
