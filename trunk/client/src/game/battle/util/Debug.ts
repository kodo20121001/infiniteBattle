import Logger from "../../../utils/Logger";

export function debugArray(arrayOfObjects) {
    // 检查传入的是否是数组
  if (!Array.isArray(arrayOfObjects)) {
    console.error("传入的不是一个数组");
    return;
  }

  // 遍历数组，打印每一个对象
  arrayOfObjects.forEach((obj, index) => {
    Logger.log(`元素 ${index}:`, obj);
  });
  }

  