import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

import { useState, useRef, useEffect } from "react";

let ffmpeg = null;

const cancel = () => {
  try {
    ffmpeg.exit();
  } catch (e) {}
  ffmpeg = null;
};

const saveData = (function () {
  if (typeof window !== "undefined") {
    var a = window?.document.createElement("a");
    window?.document.body.appendChild(a);
    a.style = "display: none";
    return function (blob, fileName) {
      var url = window?.URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    };
  }
})();

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [convert, setConvert] = useState(true);
  const textArea = useRef(null);
  const mike = useRef(null);

  const addMessage = (message) => {
    setMessages((messages) => [...messages, message]);
  };

  useEffect(() => {
    if (textArea.current) {
      textArea.current.scrollTop = textArea.current.scrollHeight;
    }
  }, [messages, textArea]);

  const transcode = async (files) => {
    if (ffmpeg === null) {
      ffmpeg = createFFmpeg({ log: true, corePath: "/ffmpeg-core.js" });
      ffmpeg.setLogger(({ type, message }) => {
        addMessage(message);
      });
    }

    const { name } = files[0];
    const splitted = name.split(".");
    splitted.pop();
    const outputName = `${splitted.join(".")}-nosound.mp4`;
    mike.current?.play();
    addMessage("Loading ffmpeg-core.js");
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
    ffmpeg.FS("writeFile", name, await fetchFile(files[0]));
    addMessage("Start transcoding");
    if (convert) {
      await ffmpeg.run("-i", name, "-an", "output.mp4");
    } else {
      await ffmpeg.run("-i", name, "-c", "copy", "-an", "output.mp4");
    }
    addMessage("Complete transcoding");
    const data = ffmpeg.FS("readFile", "output.mp4");

    saveData(new Blob([data.buffer], { type: "video/mp4" }), outputName);
    if (mike.current) {
      mike.current.currentTime = 0;
      mike.current.pause();
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Audio stripper</title>
        <meta name="description" content="Strip audio from a video" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Audio stripper</h1>
        <p className={styles.description}>
          Strip audio from videos. Simple as that.
        </p>

        <div className={styles.button}>
          <label>
            Choose a file
            <input
              type="file"
              id="uploader"
              onChange={(e) => {
                transcode(e.currentTarget.files);
              }}
            />
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={convert}
              className={styles.checkbox}
              onChange={(e) => setConvert(e.currentTarget.checked)}
            />{" "}
            Convert as well{" "}
          </label>
        </div>

        <video
          className={styles.video}
          loop
          autoPlay={false}
          controls={false}
          ref={mike}
          src="/mike.mp4"
        />

        <textarea
          className={styles.log}
          ref={textArea}
          value={messages.join("\n")}></textarea>

        <div className={styles.video}></div>
      </main>
    </div>
  );
}
