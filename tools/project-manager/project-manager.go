package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type screen int

const (
	screenMain screen = iota
	screenTests
	screenHelp
	screenOutput
)

type action struct {
	label string
	args  []string
	cwd   string
}

type runDone struct {
	action action
	out    string
	err    error
}

type model struct {
	root     string
	screen   screen
	index    int
	main     []string
	tests    []action
	running  bool
	current  action
	result   string
	lastErr  error
	width    int
	height   int
	title    lipgloss.Style
	item     lipgloss.Style
	pick     lipgloss.Style
	muted    lipgloss.Style
	panel    lipgloss.Style
	errorSty lipgloss.Style
}

func main() {
	root, err := findRoot()
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	tests, err := findTests(root)
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}

	m := newModel(root, tests)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
}

func newModel(root string, tests []action) model {
	return model{
		root:   root,
		screen: screenMain,
		main:   []string{"tests", "help", "exit"},
		tests:  tests,
		title: lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("15")),
		item: lipgloss.NewStyle().
			Foreground(lipgloss.Color("250")),
		pick: lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("86")),
		muted: lipgloss.NewStyle().
			Foreground(lipgloss.Color("241")),
		panel: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("238")).
			Padding(1, 2),
		errorSty: lipgloss.NewStyle().
			Foreground(lipgloss.Color("203")).
			Bold(true),
	}
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case runDone:
		m.running = false
		m.result = msg.out
		m.lastErr = msg.err
		return m, nil
	case tea.KeyMsg:
		if m.running && m.screen == screenOutput {
			switch msg.String() {
			case "ctrl+c":
				return m, tea.Quit
			default:
				return m, nil
			}
		}

		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit
		case "up", "k":
			m.up()
			return m, nil
		case "down", "j":
			m.down()
			return m, nil
		case "esc":
			m.back()
			return m, nil
		case "q":
			if m.screen == screenMain {
				return m, tea.Quit
			}
			m.back()
			return m, nil
		case "enter":
			return m.pickAction()
		}
	}

	return m, nil
}

func (m model) View() string {
	switch m.screen {
	case screenMain:
		return m.mainView()
	case screenTests:
		return m.testsView()
	case screenHelp:
		return m.helpView()
	case screenOutput:
		return m.outputView()
	default:
		return ""
	}
}

func (m *model) up() {
	total := m.count()
	if total == 0 {
		m.index = 0
		return
	}
	if m.index <= 0 {
		m.index = total - 1
		return
	}
	m.index--
}

func (m *model) down() {
	total := m.count()
	if total == 0 {
		m.index = 0
		return
	}
	if m.index >= total-1 {
		m.index = 0
		return
	}
	m.index++
}

func (m *model) back() {
	switch m.screen {
	case screenTests, screenHelp, screenOutput:
		m.screen = screenMain
		m.index = 0
		m.running = false
	}
}

func (m *model) count() int {
	switch m.screen {
	case screenMain:
		return len(m.main)
	case screenTests:
		return len(m.tests)
	default:
		return 0
	}
}

func (m model) pickAction() (tea.Model, tea.Cmd) {
	switch m.screen {
	case screenMain:
		if len(m.main) == 0 {
			return m, nil
		}
		s := m.main[m.index]
		switch s {
		case "tests":
			m.screen = screenTests
			m.index = 0
			return m, nil
		case "help":
			m.screen = screenHelp
			m.index = 0
			return m, nil
		default:
			return m, tea.Quit
		}
	case screenTests:
		if len(m.tests) == 0 {
			return m, nil
		}
		m.current = m.tests[m.index]
		m.screen = screenOutput
		m.running = true
		m.result = ""
		m.lastErr = nil
		return m, runCmd(m.current)
	case screenHelp:
		m.back()
		return m, nil
	case screenOutput:
		if !m.running {
			m.screen = screenTests
			m.index = 0
		}
		return m, nil
	default:
		return m, nil
	}
}

func runCmd(a action) tea.Cmd {
	return func() tea.Msg {
		cmd := exec.Command(a.args[0], a.args[1:]...)
		cmd.Dir = a.cwd

		var out bytes.Buffer
		var errb bytes.Buffer
		cmd.Stdout = &out
		cmd.Stderr = &errb

		err := cmd.Run()
		full := strings.TrimSpace(out.String())
		errs := strings.TrimSpace(errb.String())

		if errs != "" {
			if full != "" {
				full += "\n\n"
			}
			full += errs
		}
		if full == "" {
			full = "No output"
		}

		return runDone{action: a, out: full, err: err}
	}
}

func (m model) mainView() string {
	items := make([]string, 0, len(m.main))
	for i, s := range m.main {
		if i == m.index {
			items = append(items, m.pick.Render("> "+s))
		} else {
			items = append(items, m.item.Render("  "+s))
		}
	}

	body := m.title.Render("project-manager") + "\n\n" +
		strings.Join(items, "\n") + "\n\n" +
		m.muted.Render("up/down: move  enter: select  q: quit")

	return m.panel.Render(body)
}

func (m model) testsView() string {
	items := make([]string, 0, len(m.tests))
	for i, s := range m.tests {
		if i == m.index {
			items = append(items, m.pick.Render("> "+s.label))
		} else {
			items = append(items, m.item.Render("  "+s.label))
		}
	}
	if len(items) == 0 {
		items = append(items, m.muted.Render("no test directories found"))
	}

	body := m.title.Render("tests") + "\n\n" +
		strings.Join(items, "\n") + "\n\n" +
		m.muted.Render("enter: run  esc/q: back")

	return m.panel.Render(body)
}

func (m model) helpView() string {
	text := []string{
		"Main menu:",
		"- tests: open test actions",
		"- help: this screen",
		"- exit: quit",
		"",
		"Tests menu:",
		"- run all tests: runs root test command",
		"- package entries: runs tests scoped to discovered test dirs",
		"",
		"Keys:",
		"- up/down or k/j",
		"- enter to select",
		"- esc or q to go back",
	}

	body := m.title.Render("help") + "\n\n" +
		m.item.Render(strings.Join(text, "\n")) + "\n\n" +
		m.muted.Render("enter/esc/q: back")

	return m.panel.Render(body)
}

func (m model) outputView() string {
	head := m.title.Render("running: " + m.current.label)
	status := m.muted.Render("running...")
	if !m.running {
		if m.lastErr != nil {
			status = m.errorSty.Render("failed")
		} else {
			status = m.pick.Render("done")
		}
	}

	text := m.result
	if m.running {
		text = "command in progress"
	}

	keys := "ctrl+c: quit"
	if !m.running {
		keys = "enter/esc/q: back"
	}

	body := head + "\n" + status + "\n\n" +
		m.item.Render(text) + "\n\n" +
		m.muted.Render(keys)

	return m.panel.Render(body)
}

func findRoot() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	now := cwd
	for {
		pkg := filepath.Join(now, "package.json")
		pkgs := filepath.Join(now, "packages")
		if isFile(pkg) && isDir(pkgs) {
			return now, nil
		}

		next := filepath.Dir(now)
		if next == now {
			return "", fmt.Errorf("project root not found")
		}
		now = next
	}
}

func findTests(root string) ([]action, error) {
	base := filepath.Join(root, "packages")
	entries, err := os.ReadDir(base)
	if err != nil {
		return nil, err
	}

	var acts []action
	acts = append(acts, action{
		label: "run all tests",
		args:  []string{"bun", "run", "test"},
		cwd:   root,
	})

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}

		pack := filepath.Join(base, e.Name())
		dirs, err := testDirs(pack)
		if err != nil {
			return nil, err
		}
		for _, d := range dirs {
			rel, err := filepath.Rel(pack, d)
			if err != nil {
				continue
			}
			norm := filepath.ToSlash(rel)
			label := filepath.ToSlash(filepath.Join("packages", e.Name(), norm))
			acts = append(acts, action{
				label: label,
				args:  []string{"bun", "test", "--cwd", pack, norm},
				cwd:   root,
			})
		}
	}

	sort.Slice(acts[1:], func(i, j int) bool {
		return acts[i+1].label < acts[j+1].label
	})

	return acts, nil
}

func testDirs(root string) ([]string, error) {
	want := map[string]bool{
		"__test__":  true,
		"__tests__": true,
		"_tests_":   true,
	}
	seen := map[string]bool{}

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			return nil
		}
		name := d.Name()
		if want[name] {
			seen[path] = true
			return nil
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	out := make([]string, 0, len(seen))
	for s := range seen {
		out = append(out, s)
	}
	sort.Strings(out)
	return out, nil
}

func isFile(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
