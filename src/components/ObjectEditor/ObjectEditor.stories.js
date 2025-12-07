import { fn } from 'storybook/test';

import ObjectEditor from './ObjectEditor.vue';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
export default {
  title: 'New/ObjectEditor',
  component: ObjectEditor,
  tags: ['autodocs'],
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary = {
  args: {
    primary: true,
    label: 'Button',
  },
};
