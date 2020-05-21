<template>
  <div :style="live2dStyle" class="live2d">
    <div :style="wrapperStyle" class="wrapper">
      <!--suppress HtmlUnknownTarget, HtmlUnknownAttribute -->
      <iframe
        :src="`/live2d.html?m=${m}&t=${t}`"
        :style="iframeStyle"
        ref="iframe"
        sandbox="allow-same-origin allow-scripts"
        seamless
        v-if="!refreshing"
      />
    </div>
    <v-btn @click="refresh" class="refresh-btn" fab v-if="showRefresh" x-small>
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import { Prop, Watch } from 'vue-property-decorator';

const defaultType = '1-0';

@Component
export default class Live2D extends Vue {
  $refs!: {
    iframe: HTMLIFrameElement;
  };

  m = 0;

  t = 0;

  refreshing = false;

  active = true;

  @Prop({
    type: String,
    default: defaultType,
  })
  type: string | undefined;

  @Prop({
    type: Number,
    default: 400,
  })
  width: number | undefined;

  @Prop({
    type: Number,
    default: 150,
  })
  height: number | undefined;

  @Prop({
    type: Boolean,
    default: false,
  })
  showRefresh: boolean | undefined;

  get live2dStyle() {
    return {
      width: `${this.width}px`,
      height: `${this.height}px`,
      opacity: this.active ? '1' : '0.5',
    };
  }

  get wrapperStyle() {
    return {
      top: `-${(this.width || 0) - (this.height || 0)}px`,
      width: `${this.width}px`,
      height: `${this.width}px`,
    };
  }

  get iframeStyle() {
    return {
      transform: `scale(${(this.width || 0) / 400})`,
    };
  }

  @Watch('type')
  onTypeChanged(value: string) {
    this.parseType(value);
  }

  created() {
    this.parseType(this.type || defaultType);
  }

  parseType(value: string) {
    const [m, t] = value.split('-');
    this.m = parseInt(m, 10);
    this.t = parseInt(t, 10);
  }

  setPoint(x: number, y: number) {
    // noinspection JSIncompatibleTypesComparison
    if (!this.refreshing && this.$refs.iframe != null) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      if (this.$refs.iframe.contentWindow.dragMgr) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        this.$refs.iframe.contentWindow.dragMgr.setPoint(x, y);
      }
    }
  }

  async refresh() {
    this.refreshing = true;
    await this.$nextTick();
    setTimeout(() => {
      this.refreshing = false;
    });
  }

  setActive(value: boolean) {
    this.active = value;
  }
}
</script>

<style lang="scss" scoped>
  .live2d {
    position: relative;
    overflow: visible;
    width: 400px;
    height: 150px;
  }

  .wrapper {
    position: relative;
    overflow: hidden;
    pointer-events: none;
  }

  iframe {
    width: 400px;
    height: 400px;
    transform-origin: left top;
    border: 0;
    background: transparent;
  }

  .refresh-btn {
    position: absolute;
    bottom: 4px;
    left: 4px;
  }
</style>
