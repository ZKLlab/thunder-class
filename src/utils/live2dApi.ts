const apiPath = 'https://api.zsq.im/live2d';

interface SwitchData {
  model: {
    id: number;
    message: string;
    name: string;
  };
}

interface SwitchTextureData {
  textures: {
    id: number;
    model: string;
    name: string;
  };
}

export async function getNextCharacter(value = '0-0'): Promise<string> {
  const m = value.split('-')[0];
  const response = await fetch(`${apiPath}/rand/?id=${m}`);
  const data = await response.json() as SwitchData;
  return `${data.model.id}-0`;
}

export async function getNextTexture(value = '0-0'): Promise<string> {
  const m = value.split('-')[0];
  const response = await fetch(`${apiPath}/rand_textures/?id=${value}`);
  const data = await response.json() as SwitchTextureData;
  return `${m}-${data.textures.id}`;
}
