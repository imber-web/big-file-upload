<script setup>
import axios from 'axios'
import { ref } from 'vue'
import SparkMD5 from 'spark-md5'
const fileRef = ref(null)
axios.defaults.baseURL = 'http://127.0.0.1:8888'
// spark-md5文档
const getHash = (file) => {
  return new Promise((resolve) => {
    let fileReader = new FileReader()
    let spark = new SparkMD5.ArrayBuffer()
    fileReader.readAsArrayBuffer(file)
    fileReader.onload = function (e) {
      spark.append(e.target.result)
      let HASH = spark.end()
      console.log(HASH)
      resolve({
        HASH,
        suffix: /\.([a-zA-Z0-9]+)$/.exec(file.name)[1]
      })
    }
  })
}
const getAllChunks = (file, HASH, suffix) => {
  const size = 50 * 1024 //50kb  实战 2mb
  let fileChunks = []
  let index = 1
  for (let cur = 0; cur < file.size; cur += size) {
    fileChunks.push({
      file: file.slice(cur, cur + size),
      filename: `${HASH}_${index++}.${suffix}`
    })
  }
  return fileChunks
}
const getAlreadyChunks = async (HASH) => {
  return axios({
    method: 'get',
    url: '/upload_already',
    params: {
      HASH
    },
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
const diff = (alreadyChunks, allChunks) => {
  // filter
  let result = []
  allChunks.forEach((item) => {
    const fileName1 = item.filename
    let exist = false //要push的
    alreadyChunks.forEach((ite) => {
      const fileName2 = ite
      if (fileName1 === fileName2) {
        exist = true //不要push
      }
    })
    if (!exist) {
      result.push(item)
    }
  })
  return result
}
const mergeChunks = async (HASH) => {
  return axios({
    method: 'post',
    url: '/upload_merge',
    data: `HASH=${HASH}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
}
const uploadOneChunks = (formData) => {
  return axios({
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    url: '/upload_chunk',
    data: formData
  })
}
const uploadChunks = async (chunks, HASH, failChunks) => {
  // TODO:Rx.js写并发
  if (failChunks.length === 0) {
    await mergeChunks(HASH)
    return
  }
  let pool = [] //装限制并发数的promise
  let max = 3 //最大并发数
  let finish = 0 //完成数
  let failList = [] //保存失败的数组用于重传
  // 不能用ForEach  ==> 因为里面有 await
  for (let i = 0; i < chunks.length; i++) {
    let item = chunks[i]
    let formData = new FormData()
    formData.append('file', item.file)
    formData.append('filename', item.filename)
    let task = uploadOneChunks(formData) //抽出来
    task
      .then(() => {
        //请求结束后将该Promise任务从并发池中移除
        let index = pool.findIndex((t) => t === task)
        pool.splice(index, 1) // 2
      })
      .catch(() => {
        console.log('catch')
        // 状态码进来还是报错进来？
        // failList.push(item)
        // let index = pool.findIndex((t) => t === task)
        // pool.splice(index, 1) // 2
      })
      .finally(() => {
        finish++
        if (finish === chunks.length) {
          uploadChunks(failList, HASH, failList)
        }
      })
    pool.push(task) //3
    console.log(pool)
    if (pool.length === max) {
      //每当并发池跑完一个任务，就再塞入一个任务
      await Promise.race(pool)
    }
  }
}
const upload = async () => {
  // step1：获取文件对象
  const file = fileRef.value?.files[0]
  // step2：根据文件对象，通过js-spark-md5获取HASH
  const { HASH, suffix } = await getHash(file)
  // step3: 获取切片，（TODO:切片上传）
  const allChunks = getAllChunks(file, HASH, suffix)
  // step4: 获取已上传的切片
  const {
    data: { fileList: alreadyChunks }
  } = await getAlreadyChunks(HASH)
  // step5: 过滤已上传的切片（TODO:断点续传）
  // 这个chunks就是需要续传的切片
  const chunks = diff(alreadyChunks, allChunks)
  // step6：上传剩余的切片,如果没有上传过就是所有的切片(TODO:并发)
  uploadChunks(chunks, HASH, chunks)
}
</script>
<template>
  <input type="file" class="upload_inp" ref="fileRef" />
  <button @click="upload">点击上传</button>
</template>
