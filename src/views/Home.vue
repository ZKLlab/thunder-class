<template>
  <v-app>
    <v-app-bar app dark>
      <v-toolbar-title>
        <v-icon class="mx-3">mdi-weather-lightning</v-icon>
        <template>Thunder Class 雷课堂</template>
      </v-toolbar-title>
    </v-app-bar>
    <v-content>
      <v-row class="fill-height align-center justify-center">
        <v-card class="pr-4 pb-4 pl-4" max-width="100%" width="400px">
          <v-form @submit.prevent="submit" class="text-center" ref="form">
            <v-tabs centered class="mb-6" v-model="type">
              <v-tab to="/new">创建</v-tab>
              <v-tab to="/join">加入</v-tab>
            </v-tabs>
            <v-text-field
              :counter="20"
              :rules="nickNameRules"
              class="mb-2"
              clearable
              hint="必填。"
              label="输入昵称"
              outlined
              persistent-hint
              prepend-inner-icon="mdi-pencil-outline"
              tabindex="1"
              v-model="nickName"
            />
            <v-text-field
              :counter="10"
              :key="0"
              :rules="roomIdRules"
              @blur="roomId = roomId.replace(/\D/g, '')"
              class="mb-2"
              clearable
              hint="必填。"
              label="填写要加入的房间号"
              outlined
              persistent-hint
              prepend-inner-icon="mdi-cube-outline"
              tabindex="2"
              v-if="type === '/join'"
              v-model="roomId"
            />
            <div class="mb-4 grey--text text--darken-2 caption" v-if="type === '/new'">
              房间号稍后将自动生成
            </div>
            <v-btn
              :disabled="!connected"
              :loading="!connected"
              color="blue darken-4"
              large
              tabindex="3"
              type="submit"
            >
              进入课堂
            </v-btn>
          </v-form>
        </v-card>
      </v-row>
    </v-content>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import room from '@/utils/room';

@Component
export default class Home extends Vue {
  $refs!: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: Vue | any;
  };

  type = '/join';

  nickName = '';

  roomId = '';

  connected = false;

  nickNameRules = [
    (v: string) => !!v || '昵称是必填的！',
    (v: string) => (v && v.length <= 20) || '昵称不能超过20个字符！',
    (v: string) => (v && !(/^\s/.test(v) || /\s$/.test(v))) || '昵称首尾不能为空白字符！',
    (v: string) => (v && !/\s{2,}/.test(v)) || '昵称不能有连续的空白字符！',
  ];

  roomIdRules = [
    (v: string) => !!v || '房间号是必填的，如需创建新教室请点击“创建”！',
    (v: string) => (v && /^(?:\D*\d\D*){10}$/.test(v)) || '房间号需为10位数字，当前格式或位数不符！',
  ];

  // noinspection JSUnusedGlobalSymbols
  mounted() {
    const { id } = this.$route.query;
    if (typeof id === 'string') {
      if (id && /^\d{10}$/.test(id)) {
        this.roomId = id;
      }
    }
    room.on('connect', this.handleConnectedChanged);
    room.on('disconnect', this.handleConnectedChanged);
    this.handleConnectedChanged();
  }

  // noinspection JSUnusedGlobalSymbols
  beforeDestroy() {
    room.off('connect', this.handleConnectedChanged);
    room.off('disconnect', this.handleConnectedChanged);
  }

  handleConnectedChanged() {
    this.connected = room.isConnected();
  }

  submit() {
    if (this.$refs.form.validate()) {
      if (this.type === '/join') {
        room.join(this.nickName, this.roomId);
      } else {
        room.join(this.nickName);
      }
      room.once('join', (data: { roomId: string }) => {
        this.$router.replace(`/${data.roomId}`);
      });
    }
  }
}
</script>
