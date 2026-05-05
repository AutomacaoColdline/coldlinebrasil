package scheduler

import "testing"

func TestShouldRunEvent(t *testing.T) {
	cases := []struct {
		name       string
		isStart    bool
		workingNow bool
		want       bool
	}{
		{name: "start_durante_horario", isStart: true, workingNow: true, want: true},
		{name: "start_fora_horario", isStart: true, workingNow: false, want: false},
		{name: "end_durante_horario", isStart: false, workingNow: true, want: false},
		{name: "end_fora_horario", isStart: false, workingNow: false, want: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldRunEvent(tc.isStart, tc.workingNow); got != tc.want {
				t.Fatalf("esperava %v, recebeu %v", tc.want, got)
			}
		})
	}
}
