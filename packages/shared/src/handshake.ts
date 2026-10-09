export interface HelloMessage {
  type: "mesa-code-hello";
  version: string;
  platform: string;
  arch: string;
  pid: number;
}

export interface HelloAckMessage {
  type: "mesa-code-hello-ack";
  version: string;
  clientId: string;
}
