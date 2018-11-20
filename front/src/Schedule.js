import moment from 'moment';

class Schedule {
  constructor(data) {
    this.data = data;
    this.start = moment(data.start);
    this.end = moment(data.end);

    while (this.end < moment()) {
      let totalDuration = this.end - this.start;
      this.end += totalDuration ;
      this.start += totalDuration;
    }

    this.programs = [];

    for (let video of data.schedule) {
      let start = this.programs.length > 0 ? this.programs[this.programs.length-1].end : 0;
      let duration = moment.duration(video.duration);
      let end = start + duration.asMilliseconds();
      this.programs.push({
        id: video.id,
        start,
        end,
        duration,
        thumbnail: video.thumbnail,
        title: video.title
      });
    }

    this.live = data.liveStream;
  }

  getYTId(programIndex) {
    return this.programs[programIndex].id;
  }

  getNextProgramIndex(programIndex) {
    return (programIndex + 1) % this.programs.length;
  }

  getStartingProgram() {
    const elapsed = moment() - this.start;  // in milliseconds
    const programIndex = this.programs.findIndex(p => p.start <= elapsed && elapsed < p.end);

    return {
      programIndex,
      start: (elapsed - this.programs[programIndex].start) / 1000
    };
  }
}

export default Schedule;
