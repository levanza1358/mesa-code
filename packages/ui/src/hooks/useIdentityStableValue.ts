import { useRef } from "react";

/**
 * 让一个派生值在「逐项身份未变」时保持上一次引用。
 *
 * `useMemo` 的依赖数组按 `Object.is` 比较：当上游只有一处换身份（例如流式追加换了
 * 单个 row 对象），整窗口数组也随之换身份，依赖它的派生表会被迫重建。把窗口喂给本 hook，
 * 只有当数组逐项 `===` 或经 `isEqual` 判定为「未变」时才返回上一帧引用，派生表因此
 * 在无实质变化的帧之间保持稳定。
 *
 * `isEqual` 的契约是纯函数且必须返回稳定判断：默认逐项 `===`（长度不同即视为变化）。
 */
export function useIdentityStableValue<T>(
  value: T,
  isEqual: (previous: T, next: T) => boolean,
): T {
  const stable = useRef(value);
  if (!isEqual(stable.current, value)) {
    stable.current = value;
  }
  return stable.current;
}
