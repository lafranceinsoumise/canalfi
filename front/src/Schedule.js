import moment from 'moment';

class Schedule {
  constructor(data) {
    this.referenceDate = moment(data.referenceDate);
    this.programs = [];

    let start = 0;
    for (let video of data.schedule) {
      let duration = moment.duration(video.duration);
      let end = start + duration.asMilliseconds();
      this.programs.push({
        id: video.id, start, end, duration, thumbnail: video.thumbnail, title: video.title
      });
      start = end;
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
    const now = moment();
    const elapsed = now - this.referenceDate;  // in milliseconds
    const totalDuration = this.programs[this.programs.length -1].end;
    const programPosition = elapsed % totalDuration;
    const programIndex = this.programs.findIndex(p => p.start <= programPosition && programPosition < p.end);

    return {
      programIndex,
      start: (programPosition - this.programs[programIndex].start) / 1000
    };
  }
}

export default Schedule;
